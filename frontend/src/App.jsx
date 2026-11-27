
import { useState, useEffect, useCallback } from 'react';

const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api'
    : 'https://joineazy-task1-7hzn.onrender.com/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  // Theme state: defaults to refined ivory/stone luxury in light mode, toggleable to dark
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('joineazy_theme');
    return savedTheme === 'dark';
  });

  const [isRegister, setIsRegister] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [authError, setAuthError] = useState('');

  // Role-tailored navigation tabs
  const [activeTab, setActiveTab] = useState('courses');

  // Data states
  const [courses, setCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Form & interaction states
  const [courseForm, setCourseForm] = useState({ code: '', title: '', description: '' });
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberEmailInput, setMemberEmailInput] = useState({});

  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    onedrive_link: '',
    submission_type: 'group',
    due_date: '',
  });
  const [assignmentPdf, setAssignmentPdf] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [confirmModal, setConfirmModal] = useState(null);

  // Professor submission review modal
  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [submissionList, setSubmissionList] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const isProf = user?.role === 'professor' || user?.role === 'admin';

  useEffect(() => {
    localStorage.setItem('joineazy_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (user) {
      setActiveTab(isProf ? 'overview' : 'courses');
    }
  }, [user, isProf]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // --- LUXURY DESIGN TOKENS (70% Neutral / 20% Navy & Charcoal / 10% Gold) ---
  const t = darkMode
    ? {
        pageBg: 'bg-[#12151C] text-[#E8E6E1]',
        surface: 'bg-[#181C26] border-[#262C3A]',
        surfaceSubtle: 'bg-[#131720] border-[#222836]',
        headerBg: 'bg-[#151922]/95 border-[#252B39]',
        navyBand: 'bg-[#1B2436] text-[#F3EFE6] border-[#2A3750]',
        charcoalBadge: 'bg-[#222733] text-[#D6D2C9] border-[#313848]',
        textPrimary: 'text-[#F3EFE6]',
        textSecondary: 'text-[#A6A29A]',
        textMuted: 'text-[#76736C]',
        input:
          'bg-[#12161F] border-[#2B3242] text-[#F3EFE6] placeholder-[#6E6B64] focus:border-[#C9A24D]',
        goldBtn:
          'bg-[#C9A24D] hover:bg-[#D5B160] text-[#12151C] font-semibold',
        goldOutline:
          'border-[#C9A24D]/50 text-[#DFBC6A] hover:bg-[#C9A24D]/10',
        navyBtn:
          'bg-[#23304A] hover:bg-[#2C3B5B] text-[#F3EFE6] border border-[#354668]',
        dangerBtn:
          'bg-[#2A1B1E] hover:bg-[#362125] text-[#E5989B] border border-[#4A2B31]',
        divider: 'border-[#252B39]',
      }
    : {
        pageBg: 'bg-[#F7F5F0] text-[#1C212B]',
        surface: 'bg-[#FFFFFF] border-[#E5E0D5]',
        surfaceSubtle: 'bg-[#F2EFE8] border-[#E3DDD0]',
        headerBg: 'bg-[#FAF8F4]/95 border-[#E5E0D5]',
        navyBand: 'bg-[#162238] text-[#F7F5F0] border-[#1F304E]',
        charcoalBadge: 'bg-[#252A34] text-[#F7F5F0] border-[#252A34]',
        textPrimary: 'text-[#162238]',
        textSecondary: 'text-[#525866]',
        textMuted: 'text-[#7A808E]',
        input:
          'bg-[#FAF8F4] border-[#DCD5C7] text-[#162238] placeholder-[#8C919E] focus:border-[#9E7828]',
        goldBtn:
          'bg-[#A67C2E] hover:bg-[#8F6822] text-[#FAF8F4] font-semibold',
        goldOutline:
          'border-[#A67C2E]/45 text-[#8F6822] hover:bg-[#A67C2E]/8',
        navyBtn:
          'bg-[#162238] hover:bg-[#1E2E4B] text-[#F7F5F0]',
        dangerBtn:
          'bg-[#FDF2F2] hover:bg-[#FCE4E4] text-[#9B2C2C] border border-[#F3C6C6]',
        divider: 'border-[#E5E0D5]',
      };

  const fetchCoursesAndUsers = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`${API_URL}/courses`, { headers: authHeaders }),
        fetch(`${API_URL}/users/students`, { headers: authHeaders }),
      ]);
      const cData = await cRes.json();
      const sData = await sRes.json();

      if (cData.courses) setCourses(cData.courses);
      if (sData.students) setStudents(sData.students);

      if (isProf) {
        const pRes = await fetch(`${API_URL}/dashboard/progress`, { headers: authHeaders });
        const pData = await pRes.json();
        if (!pData.error) setProgressData(pData);
      } else {
        const availRes = await fetch(`${API_URL}/courses/available`, { headers: authHeaders });
        const availData = await availRes.json();
        if (availData.courses) setAvailableCourses(availData.courses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id, isProf]);

  const fetchCourseDetails = useCallback(
    async (courseId) => {
      if (!token || !courseId) return;
      setLoading(true);
      try {
        const [gRes, aRes] = await Promise.all([
          fetch(`${API_URL}/groups?courseId=${courseId}`, { headers: authHeaders }),
          fetch(`${API_URL}/assignments?courseId=${courseId}`, { headers: authHeaders }),
        ]);
        const gData = await gRes.json();
        const aData = await aRes.json();

        if (gData.groups) setGroups(gData.groups);
        if (aData.assignments) setAssignments(aData.assignments);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchCoursesAndUsers();
  }, [fetchCoursesAndUsers]);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseDetails(selectedCourse.id);
    }
  }, [selectedCourse, fetchCourseDetails]);

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
    setCourses([]);
    setSelectedCourse(null);
    setGroups([]);
    setAssignments([]);
    setProgressData(null);
  };

  // --- COURSE ACTIONS ---
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/courses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(courseForm),
    });
    const data = await res.json();
    if (res.ok) {
      setCourseForm({ code: '', title: '', description: '' });
      showToast('Course published to catalog.');
      fetchCoursesAndUsers();
    } else {
      showToast(data.error || 'Failed to create course');
    }
  };

  const handleDeleteCourse = async (e, courseId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this course and all associated assignments?')) return;
    const res = await fetch(`${API_URL}/courses/${courseId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const data = await res.json();
    if (res.ok) {
      if (selectedCourse?.id === courseId) setSelectedCourse(null);
      showToast('Course removed.');
      fetchCoursesAndUsers();
    } else {
      showToast(data.error || 'Failed to delete course');
    }
  };

  const handleEnrollCourse = async (courseId) => {
    const res = await fetch(`${API_URL}/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: authHeaders,
    });
    if (res.ok) {
      showToast('Enrolled in course.');
      fetchCoursesAndUsers();
    } else {
      showToast('Enrollment failed');
    }
  };

  const handleUnenrollCourse = async (e, courseId) => {
    e.stopPropagation();
    if (!window.confirm('Remove this course from your enrolled list?')) return;
    const res = await fetch(`${API_URL}/courses/${courseId}/enroll`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (res.ok) {
      if (selectedCourse?.id === courseId) setSelectedCourse(null);
      showToast('Course removed from your enrolled list.');
      fetchCoursesAndUsers();
    } else {
      showToast('Failed to remove course');
    }
  };

  // --- GROUP ACTIONS ---
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || !selectedCourse) return;
    const res = await fetch(`${API_URL}/groups`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: groupName,
        course_id: selectedCourse.id,
        memberIds: selectedMembers,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setGroupName('');
      setSelectedMembers([]);
      showToast('Group created. You are designated Group Leader.');
      fetchCourseDetails(selectedCourse.id);
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
      showToast('Member added to group.');
      fetchCourseDetails(selectedCourse.id);
    } else {
      showToast(data.error || 'Could not add member');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Delete this group?')) return;
    const res = await fetch(`${API_URL}/groups/${groupId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Group deleted.');
      fetchCourseDetails(selectedCourse.id);
    } else {
      showToast(data.error || 'Failed to delete group');
    }
  };

  // --- ASSIGNMENT & SUBMISSION ACTIONS ---
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedCourse) return;
    const formData = new FormData();
    formData.append('course_id', selectedCourse.id);
    formData.append('title', assignmentForm.title);
    formData.append('description', assignmentForm.description);
    formData.append('onedrive_link', assignmentForm.onedrive_link);
    formData.append('submission_type', assignmentForm.submission_type);
    formData.append('due_date', assignmentForm.due_date);
    if (assignmentPdf) formData.append('pdf', assignmentPdf);

    const res = await fetch(`${API_URL}/assignments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      setAssignmentForm({
        title: '',
        description: '',
        onedrive_link: '',
        submission_type: 'group',
        due_date: '',
      });
      setAssignmentPdf(null);
      showToast('Assignment published.');
      fetchCourseDetails(selectedCourse.id);
      fetchCoursesAndUsers();
    } else {
      showToast(data.error || 'Failed to create assignment');
    }
  };

  const handleConfirmSubmission = async () => {
    if (!confirmModal) return;
    const { assignment, groupId, file } = confirmModal;

    const formData = new FormData();
    formData.append('assignment_id', assignment.id);
    if (groupId) formData.append('group_id', groupId);
    formData.append('pdf', file);

    const res = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      setConfirmModal(null);
      setSelectedFiles({ ...selectedFiles, [assignment.id]: null });
      showToast('PDF uploaded and marked as submitted.');
      fetchCourseDetails(selectedCourse.id);
    } else {
      const data = await res.json();
      showToast(data.error || 'PDF upload failed');
    }
  };

  const handleAcknowledge = async (assignmentId) => {
    const res = await fetch(`${API_URL}/assignments/${assignmentId}/acknowledge`, {
      method: 'POST',
      headers: authHeaders,
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Submission acknowledged.');
      fetchCourseDetails(selectedCourse.id);
      fetchCoursesAndUsers();
    } else {
      showToast(data.error || 'Acknowledgment failed');
    }
  };

  const openSubmissionsDrawer = async (assignment, filter = 'all') => {
    setViewingAssignment(assignment);
    setStatusFilter(filter);
    const query = filter !== 'all' ? `?status=${filter}` : '';
    const res = await fetch(`${API_URL}/assignments/${assignment.id}/submissions${query}`, {
      headers: authHeaders,
    });
    const data = await res.json();
    if (data.submissions) setSubmissionList(data.submissions);
  };

  const ThemeToggleButton = () => (
    <button
      type="button"
      onClick={() => setDarkMode((prev) => !prev)}
      aria-label="Toggle color theme"
      className={`px-3 py-1.5 rounded-md border text-xs font-medium tracking-wide transition cursor-pointer ${t.surfaceSubtle} ${t.textSecondary}`}
    >
      {darkMode ? 'Light Mode' : 'Dark Mode'}
    </button>
  );

  // --- AUTHENTICATION VIEW ---
  if (!token || !user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors ${t.pageBg}`}>
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-end">
            <ThemeToggleButton />
          </div>

          <div className={`border rounded-lg overflow-hidden ${t.surface}`}>
            <div className={`px-7 py-6 border-b ${t.navyBand}`}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#D8B66A] font-medium">
                Academic Registry
              </p>
              <h1 className="text-2xl font-serif font-semibold tracking-tight mt-1">
                Joineazy Collegiate Portal
              </h1>
              <p className="text-xs text-[#C5CCD9] mt-1.5 leading-relaxed">
                {isRegister
                  ? 'Register a faculty or student credential to manage coursework.'
                  : 'Sign in to your course workspace and submission ledger.'}
              </p>
            </div>

            <div className="p-7">
              {authError && (
                <div className={`mb-5 px-3.5 py-2.5 rounded-md text-xs border ${t.dangerBtn}`}>
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                {isRegister && (
                  <>
                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${t.textSecondary}`}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={authForm.name}
                        onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                        placeholder="Prerna Joshi"
                        className={`w-full px-3.5 py-2 rounded-md border text-sm outline-none transition ${t.input}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${t.textSecondary}`}>
                        Account Role
                      </label>
                      <select
                        value={authForm.role}
                        onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                        className={`w-full px-3.5 py-2 rounded-md border text-sm outline-none transition ${t.input}`}
                      >
                        <option value="student">Student</option>
                        <option value="professor">Professor</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${t.textSecondary}`}>
                    University Email
                  </label>
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    placeholder="name@university.edu"
                    className={`w-full px-3.5 py-2 rounded-md border text-sm outline-none transition ${t.input}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${t.textSecondary}`}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    placeholder="Enter password"
                    className={`w-full px-3.5 py-2 rounded-md border text-sm outline-none transition ${t.input}`}
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-md text-sm tracking-wide transition cursor-pointer mt-2 ${t.goldBtn}`}
                >
                  {isRegister ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div className={`mt-6 pt-5 border-t text-center text-xs ${t.divider} ${t.textSecondary}`}>
                {isRegister ? 'Already registered?' : 'New to the portal?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setAuthError('');
                  }}
                  className="font-semibold underline underline-offset-4 cursor-pointer text-[#A67C2E] dark:text-[#D5B160]"
                >
                  {isRegister ? 'Sign In' : 'Create Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeGroup = groups[0] || null;
  const isGroupLeader = activeGroup && activeGroup.leader_id === user.id;

  // Role-specific top navigation items
  const navItems = isProf
    ? [
        { id: 'overview', label: 'Faculty Overview' },
        { id: 'courses', label: 'Course Catalog' },
      ]
    : [
        { id: 'courses', label: 'My Courses' },
        { id: 'catalog', label: 'Enroll Catalog' },
      ];

  const totalStudentsEnrolled = courses.reduce(
    (sum, c) => sum + Number(c.student_count || 0),
    0
  );
  const totalAssignmentsCount = courses.reduce(
    (sum, c) => sum + Number(c.assignment_count || 0),
    0
  );

  return (
    <div className={`min-h-screen transition-colors ${t.pageBg}`}>
      {/* UNIFIED ACADEMIC LUXURY HEADER */}
      <header className={`border-b sticky top-0 z-20 backdrop-blur-sm ${t.headerBg}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-7">
            <button
              type="button"
              onClick={() => {
                setSelectedCourse(null);
                setActiveTab(isProf ? 'overview' : 'courses');
              }}
              className="flex items-center gap-3 text-left cursor-pointer"
            >
              <span
                className={`w-9 h-9 rounded-md flex items-center justify-center font-serif font-semibold text-base border ${t.navyBand}`}
              >
                J
              </span>
              <div>
                <p className={`text-base font-serif font-semibold leading-tight ${t.textPrimary}`}>
                  Joineazy
                </p>
                <p className={`text-[11px] tracking-wide ${t.textMuted}`}>
                  {selectedCourse
                    ? `${selectedCourse.code} · ${selectedCourse.title}`
                    : 'Academic Course & Submission Ledger'}
                </p>
              </div>
            </button>

            {/* Role-Tailored Navigation */}
            {!selectedCourse && (
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                        isActive
                          ? `${t.navyBand} border`
                          : `${t.textSecondary} hover:opacity-80`
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggleButton />

            <div className="text-right pl-2 hidden sm:block">
              <p className={`text-xs font-semibold leading-tight ${t.textPrimary}`}>
                {user.name}
              </p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium border ${t.charcoalBadge}`}
              >
                {isProf ? 'Professor' : 'Student'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium transition cursor-pointer ${t.surfaceSubtle} ${t.textSecondary}`}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Role Navigation Bar */}
        {!selectedCourse && (
          <div className={`md:hidden border-t px-6 py-2 flex gap-2 ${t.divider}`}>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  activeTab === item.id ? `${t.navyBand} border` : t.textSecondary
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-md border text-xs font-medium ${t.navyBand}`}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D5B160] mr-2.5 align-middle" />
          {toast}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-9">
        {loading && (
          <p className={`text-xs tracking-wide mb-5 ${t.textMuted}`}>
            Synchronizing records...
          </p>
        )}

        {/* ============================================================
            COURSE DASHBOARD VIEW (No Course Selected)
        ============================================================ */}
        {!selectedCourse ? (
          isProf ? (
            /* --- PROFESSOR WORKSPACE --- */
            <div className="space-y-8">
              {/* Structural Navy Summary Band */}
              <div className={`border rounded-lg p-6 ${t.navyBand}`}>
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#D8B66A] font-medium">
                      Faculty Command
                    </p>
                    <h2 className="text-xl font-serif font-semibold mt-1">
                      {activeTab === 'overview'
                        ? 'Departmental Course & Submission Summary'
                        : 'Course Catalog & Creation'}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#B6C0D4]">
                      Active Courses
                    </p>
                    <p className="text-2xl font-serif font-semibold mt-1">{courses.length}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#B6C0D4]">
                      Published Assignments
                    </p>
                    <p className="text-2xl font-serif font-semibold mt-1">
                      {totalAssignmentsCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#B6C0D4]">
                      Student Enrollments / Submissions
                    </p>
                    <p className="text-2xl font-serif font-semibold text-[#E2C275] mt-1">
                      {totalStudentsEnrolled} · {progressData?.total_submissions ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Course Panel */}
                <div className={`border rounded-lg p-6 h-fit ${t.surface}`}>
                  <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#A67C2E] dark:text-[#D5B160]">
                    New Offering
                  </p>
                  <h3 className={`text-lg font-serif font-semibold mt-1 mb-5 ${t.textPrimary}`}>
                    Establish a Course
                  </h3>

                  <form onSubmit={handleCreateCourse} className="space-y-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${t.textSecondary}`}>
                        Course Code
                      </label>
                      <input
                        type="text"
                        required
                        value={courseForm.code}
                        onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                        placeholder="CS-402"
                        className={`w-full px-3.5 py-2 rounded-md border text-sm outline-none ${t.input}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${t.textSecondary}`}>
                        Course Title
                      </label>
                      <input
                        type="text"
                        required
                        value={courseForm.title}
                        onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                        placeholder="Distributed Systems & Architecture"
                        className={`w-full px-3.5 py-2 rounded-md border text-sm outline-none ${t.input}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${t.textSecondary}`}>
                        Syllabus Summary
                      </label>
                      <textarea
                        rows={3}
                        value={courseForm.description}
                        onChange={(e) =>
                          setCourseForm({ ...courseForm, description: e.target.value })
                        }
                        placeholder="Core topics, grading rubric, and group expectations..."
                        className={`w-full px-3.5 py-2 rounded-md border text-sm outline-none ${t.input}`}
                      />
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-2.5 rounded-md text-xs uppercase tracking-wider transition cursor-pointer ${t.goldBtn}`}
                    >
                      Create Course
                    </button>
                  </form>
                </div>

                {/* Professor Course Cards Grid */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-serif font-semibold ${t.textPrimary}`}>
                      Authored Courses ({courses.length})
                    </h3>
                  </div>

                  {courses.length === 0 ? (
                    <div className={`border rounded-lg p-10 text-center text-sm ${t.surface} ${t.textSecondary}`}>
                      No courses have been created yet. Use the form on the left to establish your first course.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {courses.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCourse(c)}
                          className={`border rounded-lg p-6 cursor-pointer transition flex flex-col justify-between gap-5 hover:border-[#A67C2E] dark:hover:border-[#C9A24D] ${t.surface}`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold tracking-wider border ${t.charcoalBadge}`}
                              >
                                {c.code}
                              </span>
                              <span className={`text-xs ${t.textMuted}`}>
                                {c.student_count || 0} enrolled
                              </span>
                            </div>

                            <h4 className={`text-lg font-serif font-semibold ${t.textPrimary}`}>
                              {c.title}
                            </h4>
                            <p className={`text-xs leading-relaxed line-clamp-2 ${t.textSecondary}`}>
                              {c.description || 'No description provided.'}
                            </p>
                          </div>

                          <div className={`pt-4 border-t flex items-center justify-between text-xs ${t.divider}`}>
                            <span className={t.textSecondary}>
                              {c.assignment_count || 0} assignments
                            </span>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => handleDeleteCourse(e, c.id)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${t.dangerBtn}`}
                              >
                                Delete
                              </button>
                              <span className="font-semibold text-[#A67C2E] dark:text-[#D5B160]">
                                Manage →
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* --- STUDENT WORKSPACE --- */
            <div className="space-y-9">
              {/* Enrolled Courses Section */}
              {(activeTab === 'courses' || activeTab === 'catalog') && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#A67C2E] dark:text-[#D5B160]">
                        Student Term Schedule
                      </p>
                      <h2 className={`text-xl font-serif font-semibold mt-0.5 ${t.textPrimary}`}>
                        Enrolled Courses ({courses.length})
                      </h2>
                    </div>
                  </div>

                  {courses.length === 0 ? (
                    <div className={`border rounded-lg p-8 text-sm ${t.surface} ${t.textSecondary}`}>
                      You are not enrolled in any courses yet. Select a course below to enroll.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {courses.map((c) => {
                        const pct =
                          c.total_assignments > 0
                            ? Math.round((c.acknowledged_count / c.total_assignments) * 100)
                            : 0;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCourse(c)}
                            className={`border rounded-lg p-6 cursor-pointer transition flex flex-col justify-between gap-5 hover:border-[#A67C2E] dark:hover:border-[#C9A24D] ${t.surface}`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`px-2.5 py-1 rounded text-[11px] font-semibold tracking-wider border ${t.charcoalBadge}`}
                                >
                                  {c.code}
                                </span>
                                <span className={`text-xs ${t.textMuted}`}>
                                  Prof. {c.professor_name || 'Faculty'}
                                </span>
                              </div>

                              <h3 className={`text-lg font-serif font-semibold ${t.textPrimary}`}>
                                {c.title}
                              </h3>

                              <div>
                                <div className="flex justify-between text-xs mb-1.5">
                                  <span className={t.textSecondary}>Acknowledged Progress</span>
                                  <span className="font-semibold text-[#A67C2E] dark:text-[#D5B160]">
                                    {pct}%
                                  </span>
                                </div>
                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${t.surfaceSubtle}`}>
                                  <div
                                    className="h-full bg-[#A67C2E] dark:bg-[#C9A24D] transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className={`pt-4 border-t flex items-center justify-between text-xs ${t.divider}`}>
                              <span className="font-semibold text-[#A67C2E] dark:text-[#D5B160]">
                                Open Course →
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleUnenrollCourse(e, c.id)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${t.dangerBtn}`}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Available Courses Catalog */}
              {availableCourses.filter((c) => !c.is_enrolled).length > 0 && (
                <section className="space-y-4">
                  <div>
                    <h2 className={`text-lg font-serif font-semibold ${t.textPrimary}`}>
                      Available for Enrollment
                    </h2>
                    <p className={`text-xs mt-0.5 ${t.textSecondary}`}>
                      Enroll in an active course to form groups and submit coursework.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {availableCourses
                      .filter((c) => !c.is_enrolled)
                      .map((c) => (
                        <div
                          key={c.id}
                          className={`border rounded-lg p-6 flex flex-col justify-between gap-5 ${t.surface}`}
                        >
                          <div className="space-y-2">
                            <span
                              className={`inline-block px-2.5 py-1 rounded text-[11px] font-semibold tracking-wider border ${t.charcoalBadge}`}
                            >
                              {c.code}
                            </span>
                            <h3 className={`text-base font-serif font-semibold ${t.textPrimary}`}>
                              {c.title}
                            </h3>
                            <p className={`text-xs leading-relaxed ${t.textSecondary}`}>
                              {c.description || 'Course enrollment open.'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleEnrollCourse(c.id)}
                            className={`w-full py-2 rounded-md text-xs uppercase tracking-wider transition cursor-pointer ${t.goldBtn}`}
                          >
                            Enroll in {c.code}
                          </button>
                        </div>
                      ))}
                  </div>
                </section>
              )}
            </div>
          )
        ) : (
          /* ============================================================
              INSIDE A COURSE WORKSPACE (Groups & Assignments)
          ============================================================ */
          <div className="space-y-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className={`text-xs font-medium tracking-wide cursor-pointer ${t.textSecondary} hover:underline`}
              >
                ← Return to Course List
              </button>

              <div className={`px-4 py-2 rounded-md border text-xs ${t.navyBand}`}>
                <span className="font-semibold text-[#D8B66A] mr-2">{selectedCourse.code}</span>
                <span>{selectedCourse.title}</span>
              </div>
            </div>

            {isProf ? (
              /* --- PROFESSOR COURSE VIEW --- */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className={`border rounded-lg p-6 h-fit ${t.surface}`}>
                  <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#A67C2E] dark:text-[#D5B160]">
                    Coursework
                  </p>
                  <h2 className={`text-lg font-serif font-semibold mt-1 mb-5 ${t.textPrimary}`}>
                    Publish Assignment
                  </h2>

                  <form onSubmit={handleCreateAssignment} className="space-y-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${t.textSecondary}`}>
                        Title
                      </label>
                      <input
                        type="text"
                        required
                        value={assignmentForm.title}
                        onChange={(e) =>
                          setAssignmentForm({ ...assignmentForm, title: e.target.value })
                        }
                        placeholder="Architectural Design Brief"
                        className={`w-full px-3.5 py-2 rounded-md border text-sm outline-none ${t.input}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${t.textSecondary}`}>
                        Submission Mode
                      </label>
                      <select
                        value={assignmentForm.submission_type}
                        onChange={(e) =>
                          setAssignmentForm({
                            ...assignmentForm,
                            submission_type: e.target.value,
                          })
                        }
                        className={`w-full px-3.5 py-2 rounded-md border text-sm outline-none ${t.input}`}
                      >
                        <option value="group">Group (Group Leader Acknowledges)</option>
                        <option value="individual">Individual</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${t.textSecondary}`}>
                        Instructions
                      </label>
                      <textarea
                        rows={3}
                        value={assignmentForm.description}
                        onChange={(e) =>
                          setAssignmentForm({ ...assignmentForm, description: e.target.value })
                        }
                        placeholder="Deliverables and evaluation criteria..."
                        className={`w-full px-3.5 py-2 rounded-md border text-sm outline-none ${t.input}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${t.textSecondary}`}>
                        Deadline
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={assignmentForm.due_date}
                        onChange={(e) =>
                          setAssignmentForm({ ...assignmentForm, due_date: e.target.value })
                        }
                        className={`w-full px-3.5 py-2 rounded-md border text-sm outline-none ${t.input}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${t.textSecondary}`}>
                        Brief PDF (Optional)
                      </label>
                      <label
                        className={`block w-full px-3.5 py-2 rounded-md border text-xs cursor-pointer truncate ${t.input}`}
                      >
                        {assignmentPdf ? assignmentPdf.name : 'Select PDF file'}
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => setAssignmentPdf(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-2.5 rounded-md text-xs uppercase tracking-wider transition cursor-pointer ${t.goldBtn}`}
                    >
                      Publish Assignment
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h2 className={`text-lg font-serif font-semibold ${t.textPrimary}`}>
                    Course Assignments ({assignments.length})
                  </h2>

                  {assignments.length === 0 ? (
                    <div className={`border rounded-lg p-10 text-center text-sm ${t.surface} ${t.textSecondary}`}>
                      No assignments have been published for this course yet.
                    </div>
                  ) : (
                    assignments.map((a) => (
                      <div
                        key={a.id}
                        className={`border rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${t.surface}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-base font-serif font-semibold ${t.textPrimary}`}>
                              {a.title}
                            </h3>
                            <span
                              className={`px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider font-medium border ${t.charcoalBadge}`}
                            >
                              {a.submission_type}
                            </span>
                          </div>
                          <p className={`text-xs leading-relaxed ${t.textSecondary}`}>
                            {a.description}
                          </p>
                          <p className={`text-xs ${t.textMuted}`}>
                            Due: {new Date(a.due_date).toLocaleString()}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => openSubmissionsDrawer(a, 'all')}
                          className={`px-4 py-2 rounded-md border text-xs font-medium shrink-0 transition cursor-pointer ${t.goldOutline}`}
                        >
                          Review Submissions ({a.acknowledged_count || 0} Ack.)
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* --- STUDENT COURSE VIEW --- */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Group & Leader Panel */}
                <div className="space-y-6">
                  {!activeGroup ? (
                    <div className={`border rounded-lg p-6 ${t.surface}`}>
                      <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#A67C2E] dark:text-[#D5B160]">
                        Collaboration
                      </p>
                      <h2 className={`text-lg font-serif font-semibold mt-1 mb-2 ${t.textPrimary}`}>
                        Form a Study Group
                      </h2>
                      <p className={`text-xs leading-relaxed mb-4 ${t.textSecondary}`}>
                        Creating a group assigns you as <strong>Group Leader</strong>, authorizing you to
                        acknowledge group submissions.
                      </p>

                      <form onSubmit={handleCreateGroup} className="space-y-4">
                        <input
                          type="text"
                          required
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          placeholder="Seminar Group I"
                          className={`w-full px-3.5 py-2 rounded-md border text-sm outline-none ${t.input}`}
                        />

                        {students.filter((s) => s.id !== user.id).length > 0 && (
                          <div
                            className={`max-h-32 overflow-y-auto space-y-1.5 border rounded-md p-3 ${t.surfaceSubtle}`}
                          >
                            {students
                              .filter((s) => s.id !== user.id)
                              .map((s) => (
                                <label
                                  key={s.id}
                                  className={`flex items-center gap-2 text-xs cursor-pointer ${t.textSecondary}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedMembers.includes(s.id)}
                                    onChange={(e) =>
                                      setSelectedMembers(
                                        e.target.checked
                                          ? [...selectedMembers, s.id]
                                          : selectedMembers.filter((id) => id !== s.id)
                                      )
                                    }
                                  />
                                  <span>{s.name}</span>
                                </label>
                              ))}
                          </div>
                        )}

                        <button
                          type="submit"
                          className={`w-full py-2.5 rounded-md text-xs uppercase tracking-wider transition cursor-pointer ${t.goldBtn}`}
                        >
                          Create Group
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className={`border rounded-lg p-6 space-y-4 ${t.surface}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#A67C2E] dark:text-[#D5B160]">
                            Assigned Group
                          </p>
                          <h3 className={`text-lg font-serif font-semibold mt-0.5 ${t.textPrimary}`}>
                            {activeGroup.name}
                          </h3>
                        </div>

                        {isGroupLeader && (
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(activeGroup.id)}
                            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${t.dangerBtn}`}
                          >
                            Delete
                          </button>
                        )}
                      </div>

                      <div className={`p-3 rounded-md border text-xs leading-relaxed ${t.surfaceSubtle}`}>
                        {isGroupLeader ? (
                          <span className="font-medium text-[#A67C2E] dark:text-[#D5B160]">
                            Group Leader — You are authorized to acknowledge group submissions.
                          </span>
                        ) : (
                          <span className={t.textSecondary}>
                            Only your group leader can acknowledge group submissions.
                          </span>
                        )}
                      </div>

                      <div>
                        <p className={`text-xs font-medium mb-2 ${t.textSecondary}`}>
                          Group Roster ({activeGroup.members?.length || 0})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {activeGroup.members?.map((m) => (
                            <span
                              key={m.id}
                              className={`px-2.5 py-1 rounded text-xs border ${t.surfaceSubtle} ${t.textPrimary}`}
                            >
                              {m.name} {m.id === activeGroup.leader_id ? '· Leader' : ''}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={`pt-3 border-t flex gap-2 ${t.divider}`}>
                        <input
                          type="email"
                          placeholder="Classmate email address"
                          value={memberEmailInput[activeGroup.id] || ''}
                          onChange={(e) =>
                            setMemberEmailInput({
                              ...memberEmailInput,
                              [activeGroup.id]: e.target.value,
                            })
                          }
                          className={`flex-1 px-3 py-1.5 rounded-md border text-xs outline-none ${t.input}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddMember(activeGroup.id)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${t.navyBtn}`}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignments Column */}
                <div className="lg:col-span-2 space-y-4">
                  <h2 className={`text-lg font-serif font-semibold ${t.textPrimary}`}>
                    Assignments ({assignments.length})
                  </h2>

                  {assignments.length === 0 ? (
                    <div className={`border rounded-lg p-10 text-center text-sm ${t.surface} ${t.textSecondary}`}>
                      No assignments posted for this course yet.
                    </div>
                  ) : (
                    assignments.map((a) => {
                      const mySub = a.submissions?.find((s) => s.student_id === user.id);
                      const status = mySub?.status || 'pending';
                      const pickedFile = selectedFiles[a.id];

                      return (
                        <div
                          key={a.id}
                          className={`border rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 ${t.surface}`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className={`text-base font-serif font-semibold ${t.textPrimary}`}>
                                {a.title}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium border ${t.charcoalBadge}`}
                              >
                                {a.submission_type}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded text-[11px] capitalize font-medium border ${
                                  status === 'acknowledged'
                                    ? 'border-[#A67C2E]/60 text-[#A67C2E] dark:text-[#D5B160]'
                                    : `${t.surfaceSubtle} ${t.textSecondary}`
                                }`}
                              >
                                {status}
                              </span>
                            </div>

                            <p className={`text-xs leading-relaxed ${t.textSecondary}`}>
                              {a.description}
                            </p>
                            <p className={`text-xs ${t.textMuted}`}>
                              Due: {new Date(a.due_date).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex flex-col sm:items-end gap-2 shrink-0">
                            {status === 'acknowledged' ? (
                              <span className="text-xs font-semibold uppercase tracking-wider text-[#A67C2E] dark:text-[#D5B160]">
                                Acknowledged
                              </span>
                            ) : a.submission_type === 'group' && !activeGroup ? (
                              <span className={`text-xs ${t.textMuted}`}>
                                Join or create a group first
                              </span>
                            ) : (
                              <>
                                <label
                                  className={`px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer ${t.surfaceSubtle} ${t.textPrimary}`}
                                >
                                  {pickedFile ? pickedFile.name : 'Select PDF'}
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

                                {pickedFile && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmModal({
                                        assignment: a,
                                        groupId: activeGroup?.id || null,
                                        file: pickedFile,
                                        step: 1,
                                      })
                                    }
                                    className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer ${t.navyBtn}`}
                                  >
                                    Upload PDF
                                  </button>
                                )}

                                {a.submission_type === 'individual' || isGroupLeader ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAcknowledge(a.id)}
                                    className={`px-3.5 py-1.5 rounded-md text-xs uppercase tracking-wider transition cursor-pointer ${t.goldBtn}`}
                                  >
                                    Acknowledge Submission
                                  </button>
                                ) : (
                                  <span className={`text-xs sm:text-right max-w-45 ${t.textSecondary}`}>
                                    Only your group leader can acknowledge this submission.
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* PROFESSOR SUBMISSION REVIEW & STATUS FILTER MODAL */}
      {viewingAssignment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className={`border rounded-lg max-w-2xl w-full p-6 space-y-5 ${t.surface}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#A67C2E] dark:text-[#D5B160]">
                  Submission Ledger
                </p>
                <h3 className={`text-lg font-serif font-semibold mt-0.5 ${t.textPrimary}`}>
                  {viewingAssignment.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingAssignment(null)}
                className={`text-xs font-medium cursor-pointer ${t.textSecondary}`}
              >
                Close ✕
              </button>
            </div>

            <div className={`flex flex-wrap gap-2 border-b pb-3.5 ${t.divider}`}>
              {['all', 'pending', 'submitted', 'acknowledged'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => openSubmissionsDrawer(viewingAssignment, tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition cursor-pointer ${
                    statusFilter === tab
                      ? t.goldBtn
                      : `${t.surfaceSubtle} ${t.textSecondary}`
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {submissionList.length === 0 ? (
                <p className={`text-xs py-6 text-center ${t.textSecondary}`}>
                  No records match status "{statusFilter}".
                </p>
              ) : (
                submissionList.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between p-3.5 rounded-md border ${t.surfaceSubtle}`}
                  >
                    <div>
                      <p className={`text-xs font-semibold ${t.textPrimary}`}>{s.student_name}</p>
                      <p className={`text-[11px] mt-0.5 ${t.textMuted}`}>
                        {s.student_email} {s.group_name ? `· Group: ${s.group_name}` : ''}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-[11px] capitalize font-medium border ${
                        s.status === 'acknowledged'
                          ? 'border-[#A67C2E]/60 text-[#A67C2E] dark:text-[#D5B160]'
                          : `${t.surface} ${t.textSecondary}`
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2-STEP SUBMISSION CONFIRMATION MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className={`border rounded-lg max-w-md w-full p-6 space-y-4 ${t.surface}`}>
            {confirmModal.step === 1 ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#A67C2E] dark:text-[#D5B160]">
                  Step 1 of 2
                </p>
                <h3 className={`text-lg font-serif font-semibold ${t.textPrimary}`}>
                  Verify Document Selection
                </h3>
                <p className={`text-xs leading-relaxed ${t.textSecondary}`}>
                  Attach <strong className={t.textPrimary}>{confirmModal.file?.name}</strong> for{' '}
                  <strong className={t.textPrimary}>{confirmModal.assignment.title}</strong>?
                </p>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    className={`px-4 py-2 rounded-md border text-xs font-medium cursor-pointer ${t.surfaceSubtle} ${t.textSecondary}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmModal({ ...confirmModal, step: 2 })}
                    className={`px-4 py-2 rounded-md text-xs uppercase tracking-wider cursor-pointer ${t.navyBtn}`}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#A67C2E] dark:text-[#D5B160]">
                  Step 2 of 2
                </p>
                <h3 className={`text-lg font-serif font-semibold ${t.textPrimary}`}>
                  Confirm Submission Upload
                </h3>
                <p className={`text-xs leading-relaxed ${t.textSecondary}`}>
                  This will upload your PDF and record your submission status as{' '}
                  <strong className={t.textPrimary}>Submitted</strong>.
                </p>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    className={`px-4 py-2 rounded-md border text-xs font-medium cursor-pointer ${t.surfaceSubtle} ${t.textSecondary}`}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSubmission}
                    className={`px-4 py-2 rounded-md text-xs uppercase tracking-wider cursor-pointer ${t.goldBtn}`}
                  >
                    Confirm Upload
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