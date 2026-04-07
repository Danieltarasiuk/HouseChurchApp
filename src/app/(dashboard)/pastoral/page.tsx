'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useLang } from '@/context/LangContext';
import { PASTORAL_TOPICS } from '@/data/pastoral-topics';
import ScriptureModal from '@/components/ScriptureModal';
import { X, Lock, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';

/* ---------- Types ---------- */
interface PastoralMember {
  id: string;
  name: string;
  email: string;
  role: string;
  house_church_id: string | null;
  house_church_name: string | null;
  user_id: string | null;
  last_meetings: Record<string, string>;
  last_contacted: string | null;
  red_flag_count: number;
  yellow_flag_count: number;
}

interface HouseChurch { id: string; name: string; }

interface Flag {
  id: string;
  member_id: string;
  flag_color: 'yellow' | 'red';
  description: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

interface Meeting {
  id: string;
  member_id: string;
  pastor_id: string;
  pastor_name: string;
  topic_key: string;
  meeting_date: string;
  notes: string | null;
  created_at: string;
}

interface PrayerReq {
  id: string;
  title: string;
  description: string;
  status: string;
  visibility: string;
  created_at: string;
  requester_name: string;
  member_id?: string;
  user_id?: string;
}

interface PastoralNote {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const TOPIC_KEYS = PASTORAL_TOPICS.map(t => t.key);

/* ---------- Helpers ---------- */
/** Parse a YYYY-MM-DD string into a local Date without timezone shift */
function parseDate(d: string): Date {
  const [year, month, day] = d.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateStr: string | null, lang: string): string {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0]; // guard against ISO strings
  return parseDate(clean).toLocaleDateString(
    lang === 'es' ? 'es-ES' : 'en-US',
    { month: 'short', day: 'numeric' }
  );
}

function formatDateTime(dateStr: string | null, lang: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(
    lang === 'es' ? 'es-ES' : 'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  );
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const clean = dateStr.split('T')[0]; // guard against ISO strings
  const d = parseDate(clean);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function cellColor(dateStr: string | null, hasAnyMeeting: boolean): string {
  if (!dateStr && !hasAnyMeeting) return '#f3f4f6';
  const days = daysSince(dateStr);
  if (days <= 42) return '#dcfce7';
  if (days <= 84) return '#fef9c3';
  return '#fee2e2';
}

function topicLabel(key: string, lang: string): string {
  const topic = PASTORAL_TOPICS.find(t => t.key === key);
  return topic ? (lang === 'es' ? topic.label.es : topic.label.en) : key;
}

/* ---------- Component ---------- */
export default function PastoralPage() {
  const { language: lang, t } = useLang();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const userRole = (session?.user as { role?: string })?.role;

  const [members, setMembers] = useState<PastoralMember[]>([]);
  const [churches, setChurches] = useState<HouseChurch[]>([]);
  const [loading, setLoading] = useState(true);
  const [hcFilter, setHcFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<PastoralMember | null>(null);
  const [verseModal, setVerseModal] = useState<{ reference: string } | null>(null);

  // Panel state
  const [panelFlags, setPanelFlags] = useState<Flag[]>([]);
  const [panelMeetings, setPanelMeetings] = useState<Meeting[]>([]);
  const [panelPrayers, setPanelPrayers] = useState<PrayerReq[]>([]);
  const [panelNotes, setPanelNotes] = useState<PastoralNote[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);

  // Meeting form
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingTopic, setMeetingTopic] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);

  // Flag form
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagColor, setFlagColor] = useState<'yellow' | 'red'>('yellow');
  const [flagDesc, setFlagDesc] = useState('');
  const [savingFlag, setSavingFlag] = useState(false);

  // Prayer form (panel)
  const [showPrayerForm, setShowPrayerForm] = useState(false);
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerDesc, setPrayerDesc] = useState('');
  const [prayerVisibility, setPrayerVisibility] = useState('public');
  const [savingPrayer, setSavingPrayer] = useState(false);
  const [prayerError, setPrayerError] = useState('');
  const [prayerSaved, setPrayerSaved] = useState(false);

  // Notes form
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const [expandedMeetingNotes, setExpandedMeetingNotes] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(TOPIC_KEYS));

  // Load data
  const loadMembers = useCallback((hcId?: string) => {
    setLoading(true);
    const url = hcId ? `/api/pastoral/members?house_church_id=${hcId}` : '/api/pastoral/members';
    fetch(url)
      .then(r => r.json())
      .then(data => setMembers(data.members || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/house-churches').then(r => r.json()).then(d => setChurches(d.churches || [])).catch(() => {});
    loadMembers();
  }, [loadMembers]);

  const handleHcChange = (hcId: string) => {
    setHcFilter(hcId);
    loadMembers(hcId || undefined);
  };

  // Open member panel
  const openPanel = (member: PastoralMember) => {
    setSelectedMember(member);
    setPanelLoading(true);
    setShowMeetingForm(false);
    setShowFlagForm(false);
    setShowPrayerForm(false);
    setShowNoteForm(false);
    setEditingNoteId(null);
    setDeletingNoteId(null);
    setExpandedMeetingNotes(new Set());
    setPrayerSaved(false);

    Promise.all([
      fetch(`/api/pastoral/flags?member_id=${member.id}`).then(r => r.json()),
      fetch(`/api/pastoral/meetings?member_id=${member.id}`).then(r => r.json()),
      member.user_id
        ? fetch('/api/prayer').then(r => r.json())
        : Promise.resolve({ prayers: [] }),
      fetch(`/api/pastoral/notes?member_id=${member.id}`).then(r => r.json()),
    ]).then(([flagData, meetingData, prayerData, noteData]) => {
      setPanelFlags(flagData.flags || []);
      setPanelMeetings(meetingData.meetings || []);
      // Filter prayers for this member
      const memberPrayers = (prayerData.prayers || []).filter((p: PrayerReq) =>
        p.member_id === member.id || (member.user_id && p.user_id === member.user_id)
      );
      setPanelPrayers(memberPrayers);
      setPanelNotes(noteData.notes || []);
    }).catch(() => {})
      .finally(() => setPanelLoading(false));
  };

  // Save meeting
  const saveMeeting = async () => {
    if (!meetingTopic || !meetingDate || !selectedMember) return;
    setSavingMeeting(true);
    try {
      const res = await fetch('/api/pastoral/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: selectedMember.id,
          topic_key: meetingTopic,
          meeting_date: meetingDate,
          notes: meetingNotes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPanelMeetings(prev => [{ ...data.meeting, pastor_name: session?.user?.name || '' }, ...prev]);
        setShowMeetingForm(false);
        setMeetingTopic('');
        setMeetingNotes('');
        setMeetingDate(new Date().toISOString().split('T')[0]);
        loadMembers(hcFilter || undefined);
      }
    } finally { setSavingMeeting(false); }
  };

  // Save flag
  const saveFlag = async () => {
    if (!flagDesc.trim() || !selectedMember) return;
    setSavingFlag(true);
    try {
      const res = await fetch('/api/pastoral/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: selectedMember.id, flag_color: flagColor, description: flagDesc }),
      });
      if (res.ok) {
        const data = await res.json();
        setPanelFlags(prev => [data.flag, ...prev]);
        setShowFlagForm(false);
        setFlagDesc('');
        loadMembers(hcFilter || undefined);
      }
    } finally { setSavingFlag(false); }
  };

  // Resolve flag
  const resolveFlag = async (flagId: string) => {
    const res = await fetch(`/api/pastoral/flags/${flagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_resolved: true }),
    });
    if (res.ok) {
      setPanelFlags(prev => prev.filter(f => f.id !== flagId));
      loadMembers(hcFilter || undefined);
    }
  };

  // Save prayer from panel
  const savePanelPrayer = async () => {
    if (!prayerTitle.trim() || !selectedMember) return;
    setSavingPrayer(true);
    setPrayerError('');
    setPrayerSaved(false);
    try {
      const res = await fetch('/api/prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prayerTitle,
          description: prayerDesc,
          visibility: prayerVisibility,
          member_id: selectedMember.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPanelPrayers(prev => [data.prayer, ...prev]);
        setShowPrayerForm(false);
        setPrayerTitle('');
        setPrayerDesc('');
        setPrayerVisibility('public');
        setPrayerSaved(true);
        setTimeout(() => setPrayerSaved(false), 2000);
      } else {
        setPrayerError(data.error || t('pray.submitError'));
      }
    } catch {
      setPrayerError(t('pray.submitError'));
    } finally { setSavingPrayer(false); }
  };

  // Notes CRUD
  const saveNote = async () => {
    if (!noteContent.trim() || !selectedMember) return;
    setSavingNote(true);
    try {
      const res = await fetch('/api/pastoral/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: selectedMember.id, content: noteContent }),
      });
      if (res.ok) {
        const data = await res.json();
        setPanelNotes(prev => [data.note, ...prev]);
        setShowNoteForm(false);
        setNoteContent('');
      }
    } finally { setSavingNote(false); }
  };

  const updateNote = async (noteId: string) => {
    if (!editingNoteContent.trim()) return;
    const res = await fetch(`/api/pastoral/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editingNoteContent }),
    });
    if (res.ok) {
      const data = await res.json();
      setPanelNotes(prev => prev.map(n => n.id === noteId ? data.note : n));
      setEditingNoteId(null);
      setEditingNoteContent('');
    }
  };

  const deleteNote = async (noteId: string) => {
    const res = await fetch(`/api/pastoral/notes/${noteId}`, { method: 'DELETE' });
    if (res.ok) {
      setPanelNotes(prev => prev.filter(n => n.id !== noteId));
      setDeletingNoteId(null);
    }
  };

  const filtered = members.filter(m => {
    if (!search) return true;
    return m.name.toLowerCase().includes(search.toLowerCase());
  });

  const selectedTopic = PASTORAL_TOPICS.find(tp => tp.key === meetingTopic);

  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return (
      <div>
        <div className="page-header"><h2>{t('pastoral.title')}</h2></div>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>{t('settings.adminOnly')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div><h2>{t('pastoral.title')}</h2><p>{t('pastoral.sub')}</p></div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 'auto', minWidth: '180px' }} value={hcFilter} onChange={e => handleHcChange(e.target.value)}>
          <option value="">{t('hc.allCampuses')}</option>
          {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="form-input" style={{ maxWidth: '260px' }} placeholder={t('pastoral.searchMembers')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>{t('dashboard.loading')}</div>
      ) : (
        <>
          {/* Desktop Grid */}
          <div className="pastoral-grid-wrap">
            <table className="pastoral-grid">
              <thead>
                <tr>
                  <th className="pastoral-name-col">{t('common.name')}</th>
                  <th>{t('pastoral.lastContacted')}</th>
                  {PASTORAL_TOPICS.map(tp => (
                    <th key={tp.key} title={lang === 'es' ? tp.label.es : tp.label.en}>
                      {(lang === 'es' ? tp.label.es : tp.label.en).split(' ').slice(0, 2).join(' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>{t('common.noResults')}</td></tr>
                ) : filtered.map(m => {
                  const hasAny = !!m.last_contacted;
                  return (
                    <tr key={m.id} className="pastoral-row" onClick={() => openPanel(m)}>
                      <td className="pastoral-name-col">
                        <span>{m.name}</span>
                        {m.red_flag_count > 0 && <span className="pastoral-dot-red" title="Red flag" />}
                        {m.yellow_flag_count > 0 && <span className="pastoral-dot-yellow" title="Yellow flag" />}
                      </td>
                      <td style={{ background: cellColor(m.last_contacted, hasAny) }}>
                        {m.last_contacted ? formatDate(m.last_contacted, lang) : t('pastoral.neverMet')}
                      </td>
                      {TOPIC_KEYS.map(key => (
                        <td key={key} style={{ background: cellColor(m.last_meetings[key] || null, hasAny) }}>
                          {m.last_meetings[key] ? formatDate(m.last_meetings[key], lang) : ''}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="pastoral-mobile-cards">
            {filtered.map(m => {
              const hasAny = !!m.last_contacted;
              return (
                <div key={m.id} className="pastoral-mobile-card" onClick={() => openPanel(m)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong>{m.name}</strong>
                      {m.red_flag_count > 0 && <span className="pastoral-dot-red" />}
                      {m.yellow_flag_count > 0 && <span className="pastoral-dot-yellow" />}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      {m.last_contacted ? formatDate(m.last_contacted, lang) : t('pastoral.neverMet')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                    {PASTORAL_TOPICS.map(tp => (
                      <span
                        key={tp.key}
                        title={lang === 'es' ? tp.label.es : tp.label.en}
                        style={{
                          width: '12px', height: '12px', borderRadius: '50%',
                          background: cellColor(m.last_meetings[tp.key] || null, hasAny),
                          border: '1px solid rgba(0,0,0,0.1)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Detail Panel */}
      {selectedMember && (
        <>
          <div className="pastoral-overlay" onClick={() => setSelectedMember(null)} />
          <div className="pastoral-panel">
            <div className="pastoral-panel-header">
              <h3>{selectedMember.name}</h3>
              <button className="verse-modal-close" onClick={() => setSelectedMember(null)}><X size={20} /></button>
            </div>

            {panelLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>{t('dashboard.loading')}</div>
            ) : (
              <div className="pastoral-panel-body">
                {/* Flags Section */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0 }}>{t('pastoral.activeFlags')}</h4>
                    <button className="btn btn-ghost" style={{ fontSize: '13px' }} onClick={() => setShowFlagForm(!showFlagForm)}>
                      + {t('pastoral.addFlag')}
                    </button>
                  </div>

                  {showFlagForm && (
                    <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                      <select className="form-select" style={{ marginBottom: '8px' }} value={flagColor} onChange={e => setFlagColor(e.target.value as 'yellow' | 'red')}>
                        <option value="yellow">{t('pastoral.yellow')}</option>
                        <option value="red">{t('pastoral.red')}</option>
                      </select>
                      <textarea className="form-input" rows={2} placeholder={t('pastoral.flagPlaceholder')} value={flagDesc} onChange={e => setFlagDesc(e.target.value)} />
                      <button className="btn btn-primary" style={{ marginTop: '8px', fontSize: '13px' }} onClick={saveFlag} disabled={savingFlag || !flagDesc.trim()}>
                        {t('common.save')}
                      </button>
                    </div>
                  )}

                  {panelFlags.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{t('pastoral.noFlags')}</p>
                  ) : panelFlags.map(f => (
                    <div key={f.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{f.flag_color === 'red' ? '\uD83D\uDD34' : '\uD83D\uDFE1'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '14px' }}>{f.description}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          {f.created_by_name} &middot; {formatDate(f.created_at?.split('T')[0], lang)}
                        </p>
                      </div>
                      {(f.created_by === userId || userRole === 'admin') && (
                        <button className="btn btn-ghost" style={{ fontSize: '12px', flexShrink: 0 }} onClick={() => resolveFlag(f.id)}>
                          {t('pastoral.resolve')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Prayer Section */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0 }}>{t('pastoral.prayerRequests')}</h4>
                    <button className="btn btn-ghost" style={{ fontSize: '13px' }} onClick={() => { setShowPrayerForm(!showPrayerForm); setPrayerError(''); }}>
                      + {t('pastoral.addPrayer')}
                    </button>
                  </div>

                  {prayerSaved && (
                    <p style={{ color: 'var(--accent)', fontSize: '13px', marginBottom: '8px' }}>{t('pastoral.saved')}</p>
                  )}

                  {showPrayerForm && (
                    <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                      <input className="form-input" style={{ marginBottom: '8px' }} placeholder={t('pray.requestTitle')} value={prayerTitle} onChange={e => setPrayerTitle(e.target.value)} />
                      <textarea className="form-input" rows={2} style={{ marginBottom: '8px' }} placeholder={t('pray.requestDesc')} value={prayerDesc} onChange={e => setPrayerDesc(e.target.value)} />
                      <select className="form-select" style={{ marginBottom: '8px' }} value={prayerVisibility} onChange={e => setPrayerVisibility(e.target.value)}>
                        <option value="public">{'\uD83C\uDF10'} {t('pray.public')}</option>
                        <option value="house_church">{'\uD83C\uDFE0'} {t('pray.houseChurch')}</option>
                        <option value="private">{'\uD83D\uDD12'} {t('pray.privateLabel')}</option>
                      </select>
                      {prayerError && <p style={{ color: 'var(--danger, #dc2626)', fontSize: '13px', marginBottom: '8px' }}>{prayerError}</p>}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" style={{ fontSize: '13px' }} onClick={savePanelPrayer} disabled={savingPrayer || !prayerTitle.trim()}>
                          {t('pray.submit')}
                        </button>
                        <button className="btn btn-ghost" style={{ fontSize: '13px' }} onClick={() => setShowPrayerForm(false)}>
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  )}

                  {!selectedMember.user_id && panelPrayers.length === 0 && !showPrayerForm ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{t('pastoral.noUserAccount')}</p>
                  ) : panelPrayers.length === 0 && !showPrayerForm ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{t('pastoral.noPrayer')}</p>
                  ) : panelPrayers.map(pr => (
                    <div key={pr.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{pr.title}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span className={`badge ${pr.status === 'active' ? 'badge-active' : pr.status === 'praying' ? 'badge-praying' : 'badge-answered'}`}>
                            {pr.status}
                          </span>
                          <span className="badge badge-member" style={{ fontSize: '11px' }}>
                            {pr.visibility === 'public' ? '\uD83C\uDF10' : pr.visibility === 'house_church' ? '\uD83C\uDFE0' : '\uD83D\uDD12'}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                        {formatDate(pr.created_at?.split('T')[0], lang)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Meeting History */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0 }}>{t('pastoral.meetingHistory')}</h4>
                    <button className="btn btn-primary" style={{ fontSize: '13px' }} onClick={() => setShowMeetingForm(!showMeetingForm)}>
                      + {t('pastoral.logMeeting')}
                    </button>
                  </div>

                  {showMeetingForm && (
                    <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                      <div className="form-group">
                        <label>{t('pastoral.selectTopic')}</label>
                        <select className="form-select" value={meetingTopic} onChange={e => setMeetingTopic(e.target.value)}>
                          <option value="">{t('pastoral.selectTopic')}</option>
                          {PASTORAL_TOPICS.map(tp => (
                            <option key={tp.key} value={tp.key}>{lang === 'es' ? tp.label.es : tp.label.en}</option>
                          ))}
                        </select>
                      </div>

                      {selectedTopic && (
                        <div style={{ background: 'rgba(255,255,255,0.6)', padding: '12px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>
                          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '8px' }}>
                            {lang === 'es' ? selectedTopic.description.es : selectedTopic.description.en}
                          </p>
                          <p style={{ fontWeight: 600, marginBottom: '4px' }}>{t('pastoral.helperQuestions')}</p>
                          <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                            {(lang === 'es' ? selectedTopic.questions.es : selectedTopic.questions.en).map((q, i) => (
                              <li key={i} style={{ marginBottom: '4px' }}>{q}</li>
                            ))}
                          </ul>
                          <p style={{ fontWeight: 600, marginBottom: '4px' }}>{t('pastoral.suggestedVerses')}</p>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {selectedTopic.verses.map((v, i) => (
                              <button key={i} className="disc-memory-chip" style={{ fontSize: '12px' }} onClick={() => setVerseModal({ reference: v })}>
                                {v} ↗
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="form-group">
                        <label>{t('pastoral.meetingDate')}</label>
                        <input className="form-input" type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>{t('pastoral.notes')}</label>
                        <textarea className="form-input" rows={3} placeholder={t('pastoral.notesPlaceholder')} value={meetingNotes} onChange={e => setMeetingNotes(e.target.value)} />
                      </div>
                      <button className="btn btn-primary" onClick={saveMeeting} disabled={savingMeeting || !meetingTopic}>
                        {savingMeeting ? t('pastoral.saving') : t('pastoral.save')}
                      </button>
                    </div>
                  )}

                  {panelMeetings.length === 0 && !showMeetingForm ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{t('pastoral.noMeetings')}</p>
                  ) : (
                    // Group by topic
                    TOPIC_KEYS.map(key => {
                      const topicMeetings = panelMeetings.filter(m => m.topic_key === key);
                      if (topicMeetings.length === 0) return null;
                      const isExpanded = expandedTopics.has(key);
                      return (
                        <div key={key} style={{ marginBottom: '8px' }}>
                          <button
                            onClick={() => setExpandedTopics(prev => {
                              const next = new Set(prev);
                              if (next.has(key)) next.delete(key); else next.add(key);
                              return next;
                            })}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', padding: '4px 0' }}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {topicLabel(key, lang)} ({topicMeetings.length})
                          </button>
                          {isExpanded && topicMeetings.map(mtg => {
                            const isOwn = mtg.pastor_id === userId;
                            const showNotes = isOwn && expandedMeetingNotes.has(mtg.id);
                            return (
                              <div key={mtg.id} style={{ paddingLeft: '20px', paddingBottom: '6px', borderLeft: '2px solid var(--border)', marginLeft: '6px', marginBottom: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '13px' }}>
                                    {formatDate(mtg.meeting_date, lang)} &middot; <span style={{ color: 'var(--text-tertiary)' }}>{mtg.pastor_name}</span>
                                  </span>
                                  {isOwn && mtg.notes && (
                                    <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '2px 6px' }} onClick={() => setExpandedMeetingNotes(prev => {
                                      const next = new Set(prev);
                                      if (next.has(mtg.id)) next.delete(mtg.id); else next.add(mtg.id);
                                      return next;
                                    })}>
                                      {showNotes ? t('pastoral.close') : t('pastoral.notes')}
                                    </button>
                                  )}
                                  {!isOwn && mtg.notes && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Lock size={10} /> {t('pastoral.notesLocked')}
                                    </span>
                                  )}
                                </div>
                                {showNotes && (
                                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'pre-line' }}>{mtg.notes}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Private Notes Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 style={{ margin: 0 }}>{t('pastoral.notes')}</h4>
                      <Lock size={14} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <button className="btn btn-ghost" style={{ fontSize: '13px' }} onClick={() => { setShowNoteForm(!showNoteForm); setNoteContent(''); }}>
                      {t('pastoral.addNote')}
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>{t('pastoral.notesPrivate')}</p>

                  {showNoteForm && (
                    <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                      <textarea className="form-input" rows={3} placeholder={t('pastoral.notePlaceholder')} value={noteContent} onChange={e => setNoteContent(e.target.value)} />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button className="btn btn-primary" style={{ fontSize: '13px' }} onClick={saveNote} disabled={savingNote || !noteContent.trim()}>
                          {t('pastoral.saveNote')}
                        </button>
                        <button className="btn btn-ghost" style={{ fontSize: '13px' }} onClick={() => setShowNoteForm(false)}>
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  )}

                  {panelNotes.length === 0 && !showNoteForm ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{t('pastoral.noNotes')}</p>
                  ) : panelNotes.map(note => (
                    <div key={note.id} style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                      {editingNoteId === note.id ? (
                        <>
                          <textarea className="form-input" rows={3} value={editingNoteContent} onChange={e => setEditingNoteContent(e.target.value)} />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={() => updateNote(note.id)} disabled={!editingNoteContent.trim()}>
                              {t('common.save')}
                            </button>
                            <button className="btn btn-ghost" style={{ fontSize: '12px' }} onClick={() => setEditingNoteId(null)}>
                              {t('common.cancel')}
                            </button>
                          </div>
                        </>
                      ) : deletingNoteId === note.id ? (
                        <div>
                          <p style={{ fontSize: '13px', marginBottom: '8px' }}>{t('pastoral.deleteNoteConfirm')}</p>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary" style={{ fontSize: '12px', background: 'var(--danger, #dc2626)' }} onClick={() => deleteNote(note.id)}>
                              {t('common.delete')}
                            </button>
                            <button className="btn btn-ghost" style={{ fontSize: '12px' }} onClick={() => setDeletingNoteId(null)}>
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p style={{ fontSize: '14px', whiteSpace: 'pre-line', margin: '0 0 6px' }}>{note.content}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              {formatDateTime(note.updated_at, lang)}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '2px 6px' }} onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }}>
                                <Pencil size={12} />
                              </button>
                              <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '2px 6px', color: 'var(--danger, #dc2626)' }} onClick={() => setDeletingNoteId(note.id)}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Scripture Modal */}
      {verseModal && (
        <ScriptureModal reference={verseModal.reference} lang={lang} onClose={() => setVerseModal(null)} />
      )}
    </div>
  );
}
