'use client';

import { useLang } from '@/context/LangContext';
import { formatDate } from '@/lib/formatDate';
import { PrivacyControls } from '@/components/PrivacyControls';
import { birthdayMD, formatBirthdayMD } from '@/lib/memberDisplay';

export interface DirectoryMember {
  id: string;
  first_name: string;
  last_name: string;
  house_church_name: string | null;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  birthday?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  household_name?: string | null;
}

/**
 * A member's directory entry: only the fields the server sent for this viewer
 * (hidden ones are absent), plus per-person privacy controls, which render
 * only for admins and the member's pastor.
 */
export function MemberDetailPanel({ member, onClose }: { member: DirectoryMember; onClose: () => void }) {
  const { t, language } = useLang();

  const stateZip = [member.address_state, member.address_zip].filter(Boolean).join(' ');
  const address = [member.address_street, member.address_city, stateZip].filter(Boolean).join(', ');
  const md = birthdayMD(member);
  const birthday = member.date_of_birth
    ? formatDate(member.date_of_birth, language)
    : md ? formatBirthdayMD(md, language) : null;

  // A row only when the server sent the field at all.
  const rows: [string, string | null | undefined, boolean][] = [
    [t('mem.houseChurch'), member.house_church_name, true],
    [t('auth.email'), member.email, 'email' in member],
    [t('mem.phone'), member.phone, 'phone' in member],
    [t('mem.address'), address, 'address_street' in member],
    [t('mem.birthday'), birthday, 'birthday' in member || 'date_of_birth' in member],
    [t('privacy.field.household'), member.household_name, 'household_name' in member],
  ];

  return (
    <div className="verse-overlay" onClick={onClose}>
      <div className="verse-modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${member.first_name} ${member.last_name}`}>
        <div className="verse-modal-header">
          <h3>{member.first_name} {member.last_name}</h3>
          <button className="verse-modal-close" onClick={onClose} aria-label={t('common.close')}>✕</button>
        </div>
        <div className="verse-modal-body">
          <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '6px 16px', margin: 0 }}>
            {rows.filter(([, , shown]) => shown).map(([label, value]) => (
              <div key={label} style={{ display: 'contents' }}>
                <dt style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{label}</dt>
                <dd style={{ margin: 0, fontSize: '14px', overflowWrap: 'anywhere' }}>{value || '—'}</dd>
              </div>
            ))}
          </dl>
          <div style={{ marginTop: '20px' }}>
            <PrivacyControls scope="member" id={member.id} title={t('privacy.memberTitle')} description={t('privacy.memberDesc')} />
          </div>
        </div>
      </div>
    </div>
  );
}
