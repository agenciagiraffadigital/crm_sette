import { Switch } from '@headlessui/react';
import { useState } from 'react';

export function TestSwitch() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="p-4">
      <Switch
        checked={enabled}
        onChange={setEnabled}
        className={`${
          enabled ? 'bg-green-600' : 'bg-gray-200'
        } relative inline-flex h-6 w-11 items-center rounded-full`}
      >
        <span
          className={`${
            enabled ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition`}
        />
      </Switch>
      <p>Status: {enabled ? 'ON' : 'OFF'}</p>
    </div>
  );
}
