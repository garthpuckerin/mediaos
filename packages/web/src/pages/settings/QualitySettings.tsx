import React from 'react';
import { pushToast } from '../../utils/toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';

interface QualityProfile {
  id: string;
  name: string;
  upgradeAllowed: boolean;
  cutoff: string;
  qualities: {
    quality: string;
    allowed: boolean;
    preferred: boolean;
  }[];
  minSize?: number;
  maxSize?: number;
}

const QUALITY_OPTIONS = [
  { value: '2160p', label: '2160p (4K)', size: 'large' },
  { value: '1080p', label: '1080p (Full HD)', size: 'large' },
  { value: '720p', label: '720p (HD)', size: 'medium' },
  { value: '480p', label: '480p (SD)', size: 'small' },
  { value: 'FLAC', label: 'FLAC (Lossless)', size: 'large' },
  { value: 'MP3-320', label: 'MP3 320kbps', size: 'medium' },
  { value: 'MP3-256', label: 'MP3 256kbps', size: 'medium' },
  { value: 'MP3-128', label: 'MP3 128kbps', size: 'small' },
  { value: 'EPUB', label: 'EPUB', size: 'small' },
  { value: 'PDF', label: 'PDF', size: 'medium' },
  { value: 'MOBI', label: 'MOBI', size: 'small' },
];

const VIDEO_QUALITIES = ['2160p', '1080p', '720p', '480p'];
const AUDIO_QUALITIES = ['FLAC', 'MP3-320', 'MP3-256', 'MP3-128'];
const BOOK_QUALITIES = ['EPUB', 'PDF', 'MOBI'];

const DEFAULT_PROFILES: QualityProfile[] = [
  {
    id: 'hd',
    name: 'HD-1080p',
    upgradeAllowed: true,
    cutoff: '1080p',
    qualities: VIDEO_QUALITIES.map((q) => ({
      quality: q,
      allowed: q === '1080p' || q === '720p',
      preferred: q === '1080p',
    })),
  },
  {
    id: '4k',
    name: '4K Ultra HD',
    upgradeAllowed: true,
    cutoff: '2160p',
    qualities: VIDEO_QUALITIES.map((q) => ({
      quality: q,
      allowed: true,
      preferred: q === '2160p',
    })),
  },
  {
    id: 'any',
    name: 'Any Quality',
    upgradeAllowed: true,
    cutoff: '2160p',
    qualities: VIDEO_QUALITIES.map((q) => ({
      quality: q,
      allowed: true,
      preferred: false,
    })),
  },
];

export function QualitySettings() {
  const [profiles, setProfiles] = React.useState<QualityProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editingProfile, setEditingProfile] =
    React.useState<QualityProfile | null>(null);
  const [activeTab, setActiveTab] = React.useState<'video' | 'audio' | 'books'>(
    'video'
  );

  React.useEffect(() => {
    fetch('/api/settings/quality-profiles')
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && Array.isArray(j.profiles)) {
          setProfiles(j.profiles);
        } else {
          setProfiles(DEFAULT_PROFILES);
        }
      })
      .catch(() => setProfiles(DEFAULT_PROFILES))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/quality-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles }),
      });
      if (!res.ok) throw new Error(await res.text());
      pushToast('success', 'Profiles saved');
    } catch (err) {
      pushToast('error', (err as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAddProfile = () => {
    const newProfile: QualityProfile = {
      id: Date.now().toString(36),
      name: 'New Profile',
      upgradeAllowed: true,
      cutoff:
        activeTab === 'video'
          ? '1080p'
          : activeTab === 'audio'
            ? 'MP3-320'
            : 'EPUB',
      qualities: (activeTab === 'video'
        ? VIDEO_QUALITIES
        : activeTab === 'audio'
          ? AUDIO_QUALITIES
          : BOOK_QUALITIES
      ).map((q) => ({
        quality: q,
        allowed: true,
        preferred: false,
      })),
    };
    setEditingProfile(newProfile);
  };

  const handleEditProfile = (profile: QualityProfile) => {
    setEditingProfile({ ...profile, qualities: [...profile.qualities] });
  };

  const handleDeleteProfile = (id: string) => {
    if (!confirm('Delete this profile?')) return;
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveProfile = () => {
    if (!editingProfile) return;

    setProfiles((prev) => {
      const existing = prev.findIndex((p) => p.id === editingProfile.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = editingProfile;
        return updated;
      }
      return [...prev, editingProfile];
    });
    setEditingProfile(null);
  };

  const getProfilesForTab = () => {
    const qualities =
      activeTab === 'video'
        ? VIDEO_QUALITIES
        : activeTab === 'audio'
          ? AUDIO_QUALITIES
          : BOOK_QUALITIES;
    return profiles.filter((p) =>
      p.qualities.some((q) => qualities.includes(q.quality))
    );
  };

  if (loading) {
    return (
      <section className="max-w-4xl">
        <h2 className="mb-6 text-2xl font-bold text-white">Quality Profiles</h2>
        <p className="text-gray-400">Loading...</p>
      </section>
    );
  }

  return (
    <section className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Quality Profiles</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleAddProfile}>
            Add Profile
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        {(['video', 'audio', 'books'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Profile List */}
      <div className="grid gap-4">
        {getProfilesForTab().map((profile) => (
          <Card key={profile.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-white text-lg">
                    {profile.name}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Cutoff:{' '}
                    <span className="text-cyan-400">{profile.cutoff}</span>
                    {profile.upgradeAllowed && (
                      <span className="ml-3 text-green-400">
                        ↑ Upgrades allowed
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.qualities
                      .filter((q) => q.allowed)
                      .map((q) => (
                        <span
                          key={q.quality}
                          className={`px-2 py-0.5 text-xs rounded ${
                            q.preferred
                              ? 'bg-cyan-900/50 text-cyan-300 ring-1 ring-cyan-500'
                              : 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {q.quality}
                          {q.preferred && ' ★'}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditProfile(profile)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteProfile(profile.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {getProfilesForTab().length === 0 && (
          <div className="text-center py-8 border border-dashed border-gray-700 rounded-xl">
            <div className="text-gray-500">No profiles for {activeTab}</div>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={handleAddProfile}
            >
              Create Profile
            </Button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>
                {profiles.some((p) => p.id === editingProfile.id)
                  ? 'Edit Profile'
                  : 'New Profile'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <Input
                  value={editingProfile.name}
                  onChange={(e) =>
                    setEditingProfile({
                      ...editingProfile,
                      name: e.target.value,
                    })
                  }
                  placeholder="Profile name"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Qualities
                </label>
                <div className="space-y-2">
                  {editingProfile.qualities.map((q, idx) => (
                    <div
                      key={q.quality}
                      className="flex items-center gap-3 p-2 bg-gray-800 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={q.allowed}
                        onChange={(e) => {
                          const updated = [...editingProfile.qualities];
                          updated[idx] = { ...q, allowed: e.target.checked };
                          setEditingProfile({
                            ...editingProfile,
                            qualities: updated,
                          });
                        }}
                        className="rounded border-gray-600"
                      />
                      <span className="flex-1 text-white">{q.quality}</span>
                      <button
                        onClick={() => {
                          const updated = editingProfile.qualities.map(
                            (qq, i) => ({
                              ...qq,
                              preferred: i === idx,
                            })
                          );
                          setEditingProfile({
                            ...editingProfile,
                            qualities: updated,
                          });
                        }}
                        className={`px-2 py-0.5 text-xs rounded ${
                          q.preferred
                            ? 'bg-cyan-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {q.preferred ? '★ Preferred' : 'Set Preferred'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Cutoff
                </label>
                <select
                  value={editingProfile.cutoff}
                  onChange={(e) =>
                    setEditingProfile({
                      ...editingProfile,
                      cutoff: e.target.value,
                    })
                  }
                  className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white"
                >
                  {editingProfile.qualities
                    .filter((q) => q.allowed)
                    .map((q) => (
                      <option key={q.quality} value={q.quality}>
                        {q.quality}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Stop upgrading once this quality is reached
                </p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingProfile.upgradeAllowed}
                  onChange={(e) =>
                    setEditingProfile({
                      ...editingProfile,
                      upgradeAllowed: e.target.checked,
                    })
                  }
                  className="rounded border-gray-600"
                />
                <span className="text-sm text-gray-300">Allow upgrades</span>
              </label>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveProfile}>Save Profile</Button>
                <Button
                  variant="secondary"
                  onClick={() => setEditingProfile(null)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
