import { useId } from 'react';
import { useSettings, type ThemePreference } from '../hooks/settings';
import { Modal } from './Modal';
import { SegmentedControl } from './Selectors';

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="setting-row">
      <div>
        <label htmlFor={id} className="setting-label">
          {label}
        </label>
        <p className="setting-description" id={`${id}-desc`}>
          {description}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-desc`}
        className={`switch${checked ? ' switch-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-thumb" />
      </button>
    </div>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update } = useSettings();
  return (
    <Modal open={open} title="Settings" onClose={onClose}>
      <SegmentedControl<ThemePreference>
        label="Theme"
        value={settings.theme}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        onChange={(theme) => update({ theme })}
      />
      <Toggle
        label="Sound effects"
        description="Soft clicks and chimes while you play."
        checked={settings.sound}
        onChange={(sound) => update({ sound })}
      />
      <Toggle
        label="Animations"
        description="Tile flips, shakes and bounces."
        checked={settings.animations}
        onChange={(animations) => update({ animations })}
      />
      <Toggle
        label="High-contrast colours"
        description="Orange and blue tiles, easier to tell apart with colour-vision deficiency."
        checked={settings.highContrast}
        onChange={(highContrast) => update({ highContrast })}
      />
      <p className="muted small settings-footnote">
        Progress and statistics are stored in this browser only. Clearing site data resets them.
      </p>
    </Modal>
  );
}
