import { supabase } from './supabaseClient';
import { User } from '../types';

export interface Notification {
  id: string;
  user_id: number;
  type: 'NEW_OPPORTUNITY' | 'OPPORTUNITY_ASSIGNED' | 'PROPOSAL_STATUS_CHANGED' | 'DOCUMENT_UPLOADED' | 'DEADLINE_APPROACHING' | 'SYSTEM_MAINTENANCE';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  new_opportunities: boolean;
  status_changes: boolean;
  document_uploads: boolean;
  deadlines: boolean;
  system_maintenance: boolean;
}

export const notificationService = {
  // Get user notifications
  getUserNotifications: async (userId: number, limit: number = 50): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(notification => ({
      id: notification.id,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: notification.read,
      created_at: notification.created_at,
    }));
  },

  // Get unread notifications count
  getUnreadCount: async (userId: number): Promise<number> => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<void> => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Mark all notifications as read for user
  markAllAsRead: async (userId: number): Promise<void> => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  },

  // Send notification via Edge Function
  sendNotification: async (notification: {
    user_id: number;
    type: Notification['type'];
    title: string;
    message: string;
    data?: any;
  }): Promise<void> => {
    const { error } = await supabase.functions.invoke('send-notification', {
      body: notification
    });

    if (error) throw error;
  },

  // Subscribe to real-time notifications
  subscribeToNotifications: (userId: number, callback: (notification: Notification) => void) => {
    const channel = supabase
      .channel(`user_${userId}_notifications`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as Notification;
          callback(notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Helper functions for common notification types
  notifyNewOpportunity: async (userId: number, opportunityData: { nome: string; origem: string }) => {
    await notificationService.sendNotification({
      user_id: userId,
      type: 'NEW_OPPORTUNITY',
      title: 'Nova Oportunidade Atribuída',
      message: `Uma nova oportunidade de ${opportunityData.nome} foi atribuída a você`,
      data: { opportunity: opportunityData }
    });
  },

  notifyStatusChange: async (userId: number, statusData: { type: 'opportunity' | 'proposal'; name: string; oldStatus: string; newStatus: string }) => {
    const typeLabel = statusData.type === 'opportunity' ? 'oportunidade' : 'proposta';
    await notificationService.sendNotification({
      user_id: userId,
      type: 'PROPOSAL_STATUS_CHANGED',
      title: `Status Alterado`,
      message: `A ${typeLabel} ${statusData.name} mudou de ${statusData.oldStatus} para ${statusData.newStatus}`,
      data: statusData
    });
  },

  notifyDocumentUpload: async (userId: number, documentData: { leadName: string; fileName: string }) => {
    await notificationService.sendNotification({
      user_id: userId,
      type: 'DOCUMENT_UPLOADED',
      title: 'Documento Enviado',
      message: `Novo documento ${documentData.fileName} foi enviado para ${documentData.leadName}`,
      data: documentData
    });
  },

  notifyDeadlineApproaching: async (userId: number, deadlineData: { leadName: string; deadline: string; daysLeft: number }) => {
    await notificationService.sendNotification({
      user_id: userId,
      type: 'DEADLINE_APPROACHING',
      title: 'Prazo Próximo',
      message: `O prazo para ${deadlineData.leadName} vence em ${deadlineData.daysLeft} dias`,
      data: deadlineData
    });
  },

  // Notification preferences (stored in user profile or separate table)
  getUserPreferences: async (userId: number): Promise<NotificationPreferences> => {
    // For now, return default preferences
    // In the future, this could be stored in a separate table or user profile
    return {
      new_opportunities: true,
      status_changes: true,
      document_uploads: true,
      deadlines: true,
      system_maintenance: true,
    };
  },

  updateUserPreferences: async (userId: number, preferences: NotificationPreferences): Promise<void> => {
    // For now, this is a placeholder
    // In the future, implement preferences storage
    console.log('Updating notification preferences for user', userId, preferences);
  },

  // Clean up old notifications (admin only)
  cleanOldNotifications: async (currentUser: User): Promise<void> => {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Apenas administradores podem limpar notificações antigas');
    }

    const { error } = await supabase.rpc('clean_old_notifications');
    if (error) throw error;
  }
};