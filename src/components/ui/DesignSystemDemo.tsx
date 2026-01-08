import React, { useState } from 'react';
import { Button, Card, Input, Select, ToastContainer } from './index';
import { useToast } from '../../hooks/useToast';
import { Save, Download, Settings } from 'lucide-react';

export const DesignSystemDemo: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { toasts, show, dismiss } = useToast();

  const handleShowToast = (type: 'success' | 'error' | 'warning' | 'info') => {
    show({
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Toast`,
      message: `This is a ${type} notification message.`,
      duration: 5000
    });
  };

  const handleLoadingDemo = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show({
        type: 'success',
        title: 'Operation Complete',
        message: 'Loading demo finished successfully!'
      });
    }, 2000);
  };

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ];

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Design System Demo</h1>
        <p className="text-slate-600 mb-8">Modern, responsive components for the CRM refactor</p>

        {/* Buttons Section */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700">Variants</h3>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700">Sizes</h3>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700">States</h3>
              <Button icon={<Save className="w-4 h-4" />}>With Icon</Button>
              <Button loading={loading} onClick={handleLoadingDemo}>
                {loading ? 'Loading...' : 'Loading Demo'}
              </Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </Card>

        {/* Cards Section */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="default" padding="md">
              <h3 className="font-medium text-slate-900">Default Card</h3>
              <p className="text-sm text-slate-600 mt-1">Basic card with default styling</p>
            </Card>
            <Card variant="elevated" padding="md" hover>
              <h3 className="font-medium text-slate-900">Elevated Card</h3>
              <p className="text-sm text-slate-600 mt-1">Card with elevated shadow and hover effect</p>
            </Card>
            <Card variant="outlined" padding="md">
              <h3 className="font-medium text-slate-900">Outlined Card</h3>
              <p className="text-sm text-slate-600 mt-1">Card with border styling</p>
            </Card>
          </div>
        </Card>

        {/* Form Components Section */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Form Components</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helper="We'll never share your email"
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
                error="Password must be at least 8 characters"
              />
              <Input
                label="Loading Input"
                placeholder="Loading..."
                loading={loading}
              />
            </div>
            <div className="space-y-4">
              <Select
                label="Choose Option"
                options={selectOptions}
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                placeholder="Select an option"
                required
              />
              <Select
                label="Error State"
                options={selectOptions}
                error="Please select a valid option"
              />
              <Select
                label="Loading Select"
                options={selectOptions}
                loading={loading}
              />
            </div>
          </div>
        </Card>

        {/* Toast Notifications Section */}
        <Card>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Toast Notifications</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleShowToast('success')}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              Success Toast
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleShowToast('error')}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Error Toast
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleShowToast('warning')}
              className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
            >
              Warning Toast
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleShowToast('info')}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              Info Toast
            </Button>
          </div>
        </Card>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
};