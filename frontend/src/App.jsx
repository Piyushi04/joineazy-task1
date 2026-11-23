

import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isRegister, setIsRegister] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [authError, setAuthError] = useState('');

  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberEmailInput, setMemberEmailInput] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});
  const [confirmModal, setConfirmModal] = useState(null);

  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    due_date: '',
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const fetchAllData = async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const [gRes, aRes, sRes] = await Promise.all([
        fetch(`${API_URL}/groups`, { headers: authHeaders }),
        fetch(`${API_URL}/assignments`, { headers: authHeaders }),
        fetch(`${API_URL}/users/students`, { headers: authHeaders }),
      ]);
      const gData = await gRes.json();
      const aData = await aRes.json();
      const sData = await sRes.json();

      if (gData.groups) setGroups(gData.groups);
      if (aData.assignments) setAssignments(aData.assignments);
      if (sData.students) setStudents(sData.students);

      if (user.role === 'admin') {
        const pRes = await fetch(`${API_URL}/dashboard/progress`, { headers: authHeaders });
        const pData = await pRes.json();
        if (!pData.error) setProgressData(pData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setAuthError('Cannot connect to server. Check if backend is running on port 5001.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setGroups([]);
    setAssignments([]);
    setProgressData(null);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    const res = await fetch(`${API_URL}/groups`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: groupName, memberIds: selectedMembers }),
    });
    const data = await res.json();
    if (res.ok) {
      setGroupName('');
      setSelectedMembers([]);
      showToast('Group created successfully!');
      fetchAllData();
    } else {
      showToast(data.error || 'Failed to create group');
    }
  };

  const handleAddMember = async (groupId) => {
    const email = memberEmailInput[groupId];
    if (!email) return;
    const res = await fetch(`${API_URL}/groups/${groupId}/members`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      setMemberEmailInput({ ...memberEmailInput, [groupId]: '' });
      showToast('Member added to group!');
      fetchAllData();
    } else {
      showToast(data.error || 'Could not add member');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    const res = await fetch(`${API_URL}/groups/${groupId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Group deleted!');
      fetchAllData();
    } else {
      showToast(data.error || 'Failed to delete group');
    }
  };

  const handleConfirmSubmission = async () => {
    if (!confirmModal) return;
    const { assignment, groupId, file } = confirmModal;

    const formData = new FormData();
    formData.append('assignment_id', assignment.id);
    formData.append('group_id', groupId);
    formData.append('pdf', file);

    const res = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      setConfirmModal(null);
      setSelectedFiles({ ...selectedFiles, [assignment.id]: null });
      showToast('PDF uploaded & submission confirmed!');
      fetchAllData();
    } else {
      const data = await res.json();
      showToast(data.error || 'PDF upload failed');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/assignments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(assignmentForm),
    });
    const data = await res.json();
    if (res.ok) {
      setAssignmentForm({ title: '', description: '', due_date: '' });
      showToast('Assignment published!');
      fetchAllData();
    } else {
      showToast(data.error || 'Failed to create assignment');
    }
  };

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              Joineazy Task 1
            </span>
            <h1 className="text-2xl font-bold text-white">Assignment & Group Portal</h1>
            <p className="text-sm text-slate-400 mt-1">
              {isRegister ? 'Create a Student or Professor account' : 'Sign in to manage groups & assignments'}
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    placeholder="Prerna Joshi"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                  <select
                    value={authForm.role}
                    onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Professor (Admin)</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                placeholder="you@college.edu"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition cursor-pointer"
            >
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setAuthError('');
              }}
              className="text-emerald-400 hover:underline font-medium cursor-pointer"
            >
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  const activeGroup = groups[0] || null;
  const completedCount = activeGroup
    ? assignments.filter((a) => a.submissions?.some((s) => s.group_id === activeGroup.id)).length
    : 0;
  const studentProgress =
    assignments.length > 0 ? Math.round((completedCount / assignments.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
              J
            </div>
            <div>
              <h1 className="font-bold text-white leading-tight">Joineazy Portal</h1>
              <p className="text-xs text-slate-400">Student, Group & Assignment Management</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  user.role === 'admin'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {user.role === 'admin' ? 'Professor (Admin)' : 'Student'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-500 text-slate-950 font-semibold px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading && <p className="text-sm text-slate-400 mb-4">Syncing latest data...</p>}

        {user.role === 'admin' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total Assignments</p>
                <p className="text-3xl font-bold text-white mt-1">{assignments.length}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Student Groups</p>
                <p className="text-3xl font-bold text-cyan-400 mt-1">{groups.length}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total PDF Submissions</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">
                  {progressData?.total_submissions ?? 0}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
                <h2 className="text-lg font-bold text-white mb-4">Post New Assignment</h2>
                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={assignmentForm.title}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                      placeholder="e.g., Full Stack Architecture Report"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={assignmentForm.description}
                      onChange={(e) =>
                        setAssignmentForm({ ...assignmentForm, description: e.target.value })
                      }
                      placeholder="Upload your final group report as a PDF..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Due Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={assignmentForm.due_date}
                      onChange={(e) =>
                        setAssignmentForm({ ...assignmentForm, due_date: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition cursor-pointer"
                  >
                    Publish Assignment
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <h2 className="text-lg font-bold text-white">Assignments & Group PDF Submissions</h2>
                {assignments.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                    No assignments posted yet. Create your first assignment on the left.
                  </div>
                ) : (
                  assignments.map((a) => (
                    <div
                      key={a.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
                    >
                      <div>
                        <h3 className="text-lg font-bold text-white">{a.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">{a.description}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          Due: <span className="text-slate-200">{new Date(a.due_date).toLocaleString()}</span>
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-300 font-medium">
                            Group Submissions ({a.submitted_groups_count} / {a.total_groups_count})
                          </span>
                          <span className="text-emerald-400 font-semibold">
                            {a.completion_percentage}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${a.completion_percentage}%` }}
                          />
                        </div>
                      </div>

                      {groups.length > 0 && (
                        <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                          {groups.map((g) => {
                            const sub = a.submissions?.find((s) => s.group_id === g.id);
                            return sub ? (
                              <a
                                key={g.id}
                                href={sub.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs px-3 py-1 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                              >
                                {g.name}: View PDF ↗
                              </a>
                            ) : (
                              <span
                                key={g.id}
                                className="text-xs px-3 py-1 rounded-full border bg-slate-800 text-slate-400 border-slate-700"
                              >
                                {g.name}: Pending
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {activeGroup && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs text-cyan-400 font-semibold uppercase">Active Group</span>
                    <h2 className="text-xl font-bold text-white">{activeGroup.name}</h2>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">
                    {completedCount} of {assignments.length} Completed ({studentProgress}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${studentProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-white mb-4">Create a Group</h2>
                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Group Name</label>
                      <input
                        type="text"
                        required
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g., Team Alpha"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
                      />
                    </div>

                    {students.filter((s) => s.id !== user.id).length > 0 && (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Select Classmates (Optional)
                        </label>
                        <div className="max-h-32 overflow-y-auto space-y-1.5 bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                          {students
                            .filter((s) => s.id !== user.id)
                            .map((s) => (
                              <label key={s.id} className="flex items-center gap-2 text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(s.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedMembers([...selectedMembers, s.id]);
                                    } else {
                                      setSelectedMembers(selectedMembers.filter((id) => id !== s.id));
                                    }
                                  }}
                                />
                                <span>
                                  {s.name} ({s.email})
                                </span>
                              </label>
                            ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition cursor-pointer"
                    >
                      Create Group
                    </button>
                  </form>
                </div>

                {groups.map((g) => (
                  <div key={g.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">{g.name}</h3>
                      <button
                        onClick={() => handleDeleteGroup(g.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-medium text-rose-300 transition cursor-pointer"
                      >
                        Delete Group
                      </button>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Members ({g.members?.length || 0}):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.members?.map((m) => (
                          <span
                            key={m.id}
                            className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-200"
                          >
                            {m.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex gap-2">
                      <input
                        type="email"
                        placeholder="Add member by email..."
                        value={memberEmailInput[g.id] || ''}
                        onChange={(e) =>
                          setMemberEmailInput({ ...memberEmailInput, [g.id]: e.target.value })
                        }
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                      <button
                        onClick={() => handleAddMember(g.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-lg font-bold text-white">Course Assignments</h2>
                {assignments.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                    No assignments posted yet.
                  </div>
                ) : (
                  assignments.map((a) => {
                    const submission =
                      activeGroup && a.submissions?.find((s) => s.group_id === activeGroup.id);
                    const pickedFile = selectedFiles[a.id];

                    return (
                      <div
                        key={a.id}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white">{a.title}</h3>
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                submission
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {submission ? 'Submitted ✓' : 'Pending'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">{a.description}</p>
                          <p className="text-xs text-slate-500">
                            Due: {new Date(a.due_date).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                          {!activeGroup ? (
                            <span className="text-xs text-rose-400">Create a group first to submit</span>
                          ) : submission ? (
                            <div className="flex flex-col sm:items-end gap-1">
                              <span className="text-xs text-emerald-400 font-medium">
                                Submitted for {activeGroup.name}
                              </span>
                              {submission.file_url && (
                                <a
                                  href={submission.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-cyan-300 hover:underline"
                                >
                                  View Uploaded PDF ↗
                                </a>
                              )}
                            </div>
                          ) : (
                            <>
                              <label className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 cursor-pointer text-center">
                                {pickedFile ? `📄 ${pickedFile.name}` : '1. Choose PDF File'}
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="hidden"
                                  onChange={(e) =>
                                    setSelectedFiles({
                                      ...selectedFiles,
                                      [a.id]: e.target.files?.[0] || null,
                                    })
                                  }
                                />
                              </label>

                              <button
                                disabled={!pickedFile}
                                onClick={() =>
                                  setConfirmModal({
                                    assignment: a,
                                    groupId: activeGroup.id,
                                    file: pickedFile,
                                    step: 1,
                                  })
                                }
                                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs transition cursor-pointer"
                              >
                                2. Upload & Submit PDF
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {confirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            {confirmModal.step === 1 ? (
              <>
                <h3 className="text-lg font-bold text-white">Step 1 of 2: Verify PDF File</h3>
                <p className="text-sm text-slate-300">
                  Are you sure you want to upload{' '}
                  <strong className="text-cyan-300">{confirmModal.file?.name}</strong> for{' '}
                  <strong className="text-white">{confirmModal.assignment.title}</strong>?
                </p>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-sm text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setConfirmModal({ ...confirmModal, step: 2 })}
                    className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-sm cursor-pointer"
                  >
                    Yes, Continue →
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-emerald-400">Step 2 of 2: Final Confirmation</h3>
                <p className="text-sm text-slate-300">
                  Confirming will upload your PDF and mark this assignment as{' '}
                  <strong>Submitted</strong> for your entire group. Proceed?
                </p>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-sm text-slate-300 cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleConfirmSubmission}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-sm cursor-pointer"
                  >
                    Confirm & Upload PDF ✓
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}