





// const express = require('express');
// const cors = require('cors');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// require('dotenv').config();

// const pool = require('./db');
// const auth = require('./middleware/auth');

// const app = express();
// app.use(cors());
// app.use(express.json());

// const uploadDir = path.join(__dirname, 'uploads');
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }
// app.use('/uploads', express.static(uploadDir));

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => {
//     const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
//     cb(null, `${Date.now()}-${safeName}`);
//   },
// });

// const upload = multer({
//   storage,
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === 'application/pdf') cb(null, true);
//     else cb(new Error('Only PDF files are allowed'));
//   },
//   limits: { fileSize: 10 * 1024 * 1024 },
// });

// app.post('/api/auth/register', async (req, res) => {
//   const { name, email, password, role = 'student' } = req.body;
//   if (!name || !email || !password) {
//     return res.status(400).json({ error: 'Name, email, and password are required' });
//   }
//   try {
//     const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
//     if (existing.rows.length > 0) {
//       return res.status(400).json({ error: 'Email already registered' });
//     }
//     const hashed = await bcrypt.hash(password, 10);
//     const result = await pool.query(
//       'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
//       [name, email, hashed, role === 'admin' ? 'admin' : 'student']
//     );
//     const user = result.rows[0];
//     const token = jwt.sign(
//       { id: user.id, email: user.email, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );
//     res.status(201).json({ token, user });
//   } catch (err) {
//     console.error('Register error:', err);
//     res.status(500).json({ error: 'Server error during registration' });
//   }
// });

// app.post('/api/auth/login', async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
//     const user = result.rows[0];
//     if (!user || !(await bcrypt.compare(password, user.password_hash))) {
//       return res.status(401).json({ error: 'Invalid email or password' });
//     }
//     const token = jwt.sign(
//       { id: user.id, email: user.email, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );
//     res.json({
//       token,
//       user: { id: user.id, name: user.name, email: user.email, role: user.role },
//     });
//   } catch (err) {
//     console.error('Login error:', err);
//     res.status(500).json({ error: 'Server error during login' });
//   }
// });

// app.get('/api/users/students', auth, async (req, res) => {
//   try {
//     const result = await pool.query(
//       "SELECT id, name, email FROM users WHERE role = 'student' ORDER BY name ASC"
//     );
//     res.json({ students: result.rows });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch students' });
//   }
// });

// app.get('/api/groups', auth, async (req, res) => {
//   try {
//     let groupsRes;
//     if (req.user.role === 'admin') {
//       groupsRes = await pool.query('SELECT * FROM groups ORDER BY id DESC');
//     } else {
//       groupsRes = await pool.query(
//         `SELECT g.* FROM groups g
//          JOIN group_members gm ON g.id = gm.group_id
//          WHERE gm.user_id = $1
//          ORDER BY g.id DESC`,
//         [req.user.id]
//       );
//     }

//     const groups = [];
//     for (const g of groupsRes.rows) {
//       const membersRes = await pool.query(
//         `SELECT u.id, u.name, u.email FROM users u
//          JOIN group_members gm ON u.id = gm.user_id
//          WHERE gm.group_id = $1`,
//         [g.id]
//       );
//       groups.push({ ...g, members: membersRes.rows });
//     }
//     res.json({ groups });
//   } catch (err) {
//     console.error('Get groups error:', err);
//     res.status(500).json({ error: 'Failed to fetch groups' });
//   }
// });

// app.post('/api/groups', auth, async (req, res) => {
//   const { name, memberIds = [] } = req.body;
//   if (!name) return res.status(400).json({ error: 'Group name is required' });

//   try {
//     const groupRes = await pool.query(
//       'INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING *',
//       [name, req.user.id]
//     );
//     const group = groupRes.rows[0];
//     const allMemberIds = Array.from(new Set([req.user.id, ...memberIds]));
//     for (const uid of allMemberIds) {
//       await pool.query(
//         'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
//         [group.id, uid]
//       );
//     }
//     res.status(201).json({ group });
//   } catch (err) {
//     console.error('Create group error:', err);
//     res.status(500).json({ error: 'Failed to create group' });
//   }
// });

// app.post('/api/groups/:id/members', auth, async (req, res) => {
//   const { email } = req.body;
//   try {
//     const userRes = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
//     if (userRes.rows.length === 0) {
//       return res.status(404).json({ error: 'No student found with that email' });
//     }
//     const targetUser = userRes.rows[0];
//     await pool.query(
//       'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
//       [req.params.id, targetUser.id]
//     );
//     res.json({ message: 'Member added', member: targetUser });
//   } catch (err) {
//     console.error('Add member error:', err);
//     res.status(500).json({ error: 'Failed to add member' });
//   }
// });

// app.delete('/api/groups/:id', auth, async (req, res) => {
//   try {
//     const memberCheck = await pool.query(
//       'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
//       [req.params.id, req.user.id]
//     );
//     if (req.user.role !== 'admin' && memberCheck.rowCount === 0) {
//       return res.status(403).json({ error: 'Not authorized to delete this group' });
//     }
//     await pool.query('DELETE FROM groups WHERE id = $1', [req.params.id]);
//     res.json({ message: 'Group deleted successfully' });
//   } catch (err) {
//     console.error('Delete group error:', err);
//     res.status(500).json({ error: 'Failed to delete group' });
//   }
// });

// app.get('/api/assignments', auth, async (req, res) => {
//   try {
//     const assignmentsRes = await pool.query('SELECT * FROM assignments ORDER BY due_date ASC');
//     const groupsCountRes = await pool.query('SELECT COUNT(*)::int AS count FROM groups');
//     const totalGroups = groupsCountRes.rows[0].count;

//     const assignments = [];
//     for (const a of assignmentsRes.rows) {
//       const subsRes = await pool.query('SELECT * FROM submissions WHERE assignment_id = $1', [a.id]);
//       const submittedCount = subsRes.rows.length;
//       const pct = totalGroups > 0 ? Math.round((submittedCount / totalGroups) * 100) : 0;
//       assignments.push({
//         ...a,
//         submissions: subsRes.rows,
//         submitted_groups_count: submittedCount,
//         total_groups_count: totalGroups,
//         completion_percentage: pct,
//       });
//     }
//     res.json({ assignments });
//   } catch (err) {
//     console.error('Get assignments error:', err);
//     res.status(500).json({ error: 'Failed to fetch assignments' });
//   }
// });

// app.post('/api/assignments', auth, upload.single('pdf'), async (req, res) => {
//   if (req.user.role !== 'admin') {
//     return res.status(403).json({ error: 'Only professors can create assignments' });
//   }
//   const { title, description, due_date } = req.body;
//   if (!title || !due_date) {
//     return res.status(400).json({ error: 'Title and due date are required' });
//   }
//   const fileUrl = req.file
//     ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
//     : null;
//   try {
//     const result = await pool.query(
//       'INSERT INTO assignments (title, description, due_date, created_by, file_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
//       [title, description || '', due_date, req.user.id, fileUrl]
//     );
//     res.status(201).json({ assignment: result.rows[0] });
//   } catch (err) {
//     console.error('Create assignment error:', err);
//     res.status(500).json({ error: 'Failed to create assignment' });
//   }
// });

// app.post('/api/submissions', auth, upload.single('pdf'), async (req, res) => {
//   const { assignment_id, group_id } = req.body;
//   if (!assignment_id || !group_id || !req.file) {
//     return res.status(400).json({ error: 'Assignment, group, and PDF file are required' });
//   }
//   const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
//   try {
//     const result = await pool.query(
//       `INSERT INTO submissions (assignment_id, group_id, confirmed_by, file_url)
//        VALUES ($1, $2, $3, $4)
//        ON CONFLICT (assignment_id, group_id)
//        DO UPDATE SET confirmed_by = $3, file_url = $4, submitted_at = NOW()
//        RETURNING *`,
//       [assignment_id, group_id, req.user.id, fileUrl]
//     );
//     res.status(201).json({ submission: result.rows[0] });
//   } catch (err) {
//     console.error('Submission error:', err);
//     res.status(500).json({ error: 'Failed to submit PDF' });
//   }
// });

// app.get('/api/dashboard/progress', auth, async (req, res) => {
//   if (req.user.role !== 'admin') {
//     return res.status(403).json({ error: 'Admin access required' });
//   }
//   try {
//     const subsRes = await pool.query('SELECT COUNT(*)::int AS count FROM submissions');
//     res.json({ total_submissions: subsRes.rows[0].count });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to load dashboard progress' });
//   }
// });

// const PORT = process.env.PORT || 5001;
// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


















const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const pool = require('./db');
const auth = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// File upload setup for assignment/submission PDFs
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const isProfessor = (role) => role === 'professor' || role === 'admin';

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role = 'student' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  const normalizedRole = isProfessor(role) ? 'professor' : 'student';

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name.trim(), email.toLowerCase().trim(), hashed, normalizedRole]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.get('/api/users/students', auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email FROM users WHERE role = 'student' ORDER BY name ASC"
    );
    res.json({ students: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// ==========================================
// 2. COURSE MANAGEMENT ROUTES
// ==========================================
app.get('/api/courses', auth, async (req, res) => {
  try {
    if (isProfessor(req.user.role)) {
      const { rows } = await pool.query(
        `SELECT
          c.*,
          COUNT(DISTINCT ce.student_id)::int AS student_count,
          COUNT(DISTINCT a.id)::int AS assignment_count,
          COUNT(s.id) FILTER (WHERE s.status = 'acknowledged')::int AS acknowledged_count,
          COUNT(s.id) FILTER (WHERE s.status = 'submitted')::int AS submitted_count,
          COUNT(s.id) FILTER (WHERE s.status = 'pending')::int AS pending_count
         FROM courses c
         LEFT JOIN course_enrollments ce ON ce.course_id = c.id
         LEFT JOIN assignments a ON a.course_id = c.id
         LEFT JOIN submissions s ON s.assignment_id = a.id
         WHERE c.professor_id = $1
         GROUP BY c.id
         ORDER BY c.id DESC`,
        [req.user.id]
      );
      return res.json({ courses: rows });
    }

    const { rows } = await pool.query(
      `SELECT
        c.*,
        u.name AS professor_name,
        COUNT(a.id)::int AS total_assignments,
        COUNT(s.id) FILTER (WHERE s.status = 'acknowledged')::int AS acknowledged_count
       FROM course_enrollments ce
       JOIN courses c ON c.id = ce.course_id
       LEFT JOIN users u ON u.id = c.professor_id
       LEFT JOIN assignments a ON a.course_id = c.id
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $1
       WHERE ce.student_id = $1
       GROUP BY c.id, u.name
       ORDER BY c.id DESC`,
      [req.user.id]
    );
    res.json({ courses: rows });
  } catch (err) {
    console.error('Get courses error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

app.get('/api/courses/available', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS professor_name,
        EXISTS(
          SELECT 1 FROM course_enrollments ce
          WHERE ce.course_id = c.id AND ce.student_id = $1
        ) AS is_enrolled
       FROM courses c
       LEFT JOIN users u ON u.id = c.professor_id
       ORDER BY c.id DESC`,
      [req.user.id]
    );
    res.json({ courses: rows });
  } catch (err) {
    console.error('Available courses error:', err);
    res.status(500).json({ error: 'Failed to load available courses' });
  }
});

app.post('/api/courses', auth, async (req, res) => {
  if (!isProfessor(req.user.role)) {
    return res.status(403).json({ error: 'Only professors can create courses' });
  }
  const { code, title, description } = req.body;
  if (!code || !title) {
    return res.status(400).json({ error: 'Course code and title are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO courses (code, title, description, professor_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [code.trim().toUpperCase(), title.trim(), description || '', req.user.id]
    );
    res.status(201).json({ course: rows[0] });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ error: 'Failed to create course (course code may already exist)' });
  }
});

app.post('/api/courses/:courseId/enroll', auth, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO course_enrollments (course_id, student_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.courseId, req.user.id]
    );

    // Seed pending submission rows for existing assignments in this course
    const assignRes = await pool.query('SELECT id FROM assignments WHERE course_id = $1', [
      req.params.courseId,
    ]);
    for (const a of assignRes.rows) {
      await pool.query(
        `INSERT INTO submissions (assignment_id, student_id, status)
         VALUES ($1, $2, 'pending') ON CONFLICT DO NOTHING`,
        [a.id, req.user.id]
      );
    }

    res.status(201).json({ message: 'Enrolled successfully' });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Failed to enroll in course' });
  }
});

// ==========================================
// 3. GROUPS & GROUP LEADER ROUTES
// ==========================================
app.get('/api/groups', auth, async (req, res) => {
  const { courseId } = req.query;
  try {
    let groupsRes;
    if (isProfessor(req.user.role)) {
      groupsRes = courseId
        ? await pool.query('SELECT * FROM groups WHERE course_id = $1 ORDER BY id DESC', [courseId])
        : await pool.query('SELECT * FROM groups ORDER BY id DESC');
    } else {
      groupsRes = courseId
        ? await pool.query(
            `SELECT g.* FROM groups g
             JOIN group_members gm ON g.id = gm.group_id
             WHERE gm.student_id = $1 AND g.course_id = $2
             ORDER BY g.id DESC`,
            [req.user.id, courseId]
          )
        : await pool.query(
            `SELECT g.* FROM groups g
             JOIN group_members gm ON g.id = gm.group_id
             WHERE gm.student_id = $1
             ORDER BY g.id DESC`,
            [req.user.id]
          );
    }

    const groups = [];
    for (const g of groupsRes.rows) {
      const membersRes = await pool.query(
        `SELECT u.id, u.name, u.email FROM users u
         JOIN group_members gm ON u.id = gm.student_id
         WHERE gm.group_id = $1`,
        [g.id]
      );
      groups.push({ ...g, members: membersRes.rows });
    }
    res.json({ groups });
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

app.post('/api/groups', auth, async (req, res) => {
  const { name, course_id, memberIds = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name is required' });

  try {
    const groupRes = await pool.query(
      'INSERT INTO groups (name, course_id, leader_id) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), course_id || null, req.user.id]
    );
    const group = groupRes.rows[0];
    const allMemberIds = Array.from(new Set([req.user.id, ...memberIds]));
    for (const uid of allMemberIds) {
      await pool.query(
        'INSERT INTO group_members (group_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [group.id, uid]
      );
    }
    res.status(201).json({ group });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

app.post('/api/groups/:id/members', auth, async (req, res) => {
  const { email } = req.body;
  try {
    const userRes = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'No student found with that email' });
    }
    const targetUser = userRes.rows[0];
    await pool.query(
      'INSERT INTO group_members (group_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, targetUser.id]
    );
    res.json({ message: 'Member added', member: targetUser });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

app.delete('/api/groups/:id', auth, async (req, res) => {
  try {
    const groupRes = await pool.query('SELECT leader_id FROM groups WHERE id = $1', [req.params.id]);
    const isLeader = groupRes.rows[0]?.leader_id === req.user.id;
    if (!isProfessor(req.user.role) && !isLeader) {
      return res
        .status(403)
        .json({ error: 'Only the group leader or professor can delete this group' });
    }
    await pool.query('DELETE FROM groups WHERE id = $1', [req.params.id]);
    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// ==========================================
// 4. ASSIGNMENTS & SUBMISSIONS ROUTES
// ==========================================
app.get('/api/assignments', auth, async (req, res) => {
  const { courseId } = req.query;
  try {
    const assignmentsRes = courseId
      ? await pool.query('SELECT * FROM assignments WHERE course_id = $1 ORDER BY deadline ASC', [
          courseId,
        ])
      : await pool.query('SELECT * FROM assignments ORDER BY deadline ASC');

    const groupsCountRes = await pool.query('SELECT COUNT(*)::int AS count FROM groups');
    const totalGroups = groupsCountRes.rows[0].count;

    const assignments = [];
    for (const a of assignmentsRes.rows) {
      const subsRes = await pool.query('SELECT * FROM submissions WHERE assignment_id = $1', [a.id]);
      const ackCount = subsRes.rows.filter((s) => s.status === 'acknowledged').length;
      const pct = totalGroups > 0 ? Math.round((subsRes.rows.length / totalGroups) * 100) : 0;
      assignments.push({
        ...a,
        due_date: a.deadline,
        submissions: subsRes.rows,
        acknowledged_count: ackCount,
        submitted_groups_count: subsRes.rows.length,
        total_groups_count: totalGroups,
        completion_percentage: pct,
      });
    }
    res.json({ assignments });
  } catch (err) {
    console.error('Get assignments error:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

app.post('/api/assignments', auth, upload.single('pdf'), async (req, res) => {
  if (!isProfessor(req.user.role)) {
    return res.status(403).json({ error: 'Only professors can create assignments' });
  }
  const {
    title,
    description,
    onedrive_link,
    due_date,
    deadline,
    course_id,
    submission_type = 'group',
  } = req.body;
  const finalDeadline = deadline || due_date;

  if (!title || !finalDeadline) {
    return res.status(400).json({ error: 'Title and deadline are required' });
  }

  const fileUrl = req.file
    ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    : onedrive_link || null;

  try {
    const result = await pool.query(
      `INSERT INTO assignments (course_id, title, description, onedrive_link, submission_type, deadline)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        course_id || null,
        title.trim(),
        description || '',
        fileUrl,
        submission_type === 'individual' ? 'individual' : 'group',
        finalDeadline,
      ]
    );
    const assignment = result.rows[0];

    // Seed 'pending' submission rows for all enrolled students in this course
    if (course_id) {
      const enrolled = await pool.query(
        `SELECT ce.student_id, gm.group_id
         FROM course_enrollments ce
         LEFT JOIN group_members gm ON gm.student_id = ce.student_id
         LEFT JOIN groups g ON g.id = gm.group_id AND g.course_id = ce.course_id
         WHERE ce.course_id = $1`,
        [course_id]
      );
      for (const row of enrolled.rows) {
        await pool.query(
          `INSERT INTO submissions (assignment_id, student_id, group_id, status)
           VALUES ($1, $2, $3, 'pending') ON CONFLICT DO NOTHING`,
          [assignment.id, row.student_id, assignment.submission_type === 'group' ? row.group_id : null]
        );
      }
    }

    res.status(201).json({ assignment: { ...assignment, file_url: fileUrl } });
  } catch (err) {
    console.error('Create assignment error:', err);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Group leader acknowledgment — updates every member of the group
app.post('/api/assignments/:id/acknowledge', auth, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const assignRes = await pool.query('SELECT * FROM assignments WHERE id = $1', [assignmentId]);
    if (assignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    const assignment = assignRes.rows[0];

    if (assignment.submission_type === 'individual') {
      const { rows } = await pool.query(
        `INSERT INTO submissions (assignment_id, student_id, status, submitted_at, acknowledged_by, acknowledged_at)
         VALUES ($1, $2, 'acknowledged', NOW(), $2, NOW())
         ON CONFLICT (assignment_id, student_id)
         DO UPDATE SET status = 'acknowledged', acknowledged_by = $2, acknowledged_at = NOW()
         RETURNING *`,
        [assignmentId, req.user.id]
      );
      return res.json({ message: 'Individual submission acknowledged', submissions: rows });
    }

    // Group assignment: verify caller is the group leader
    const grpRes = await pool.query(
      `SELECT g.id, g.leader_id
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.student_id = $1 AND ($2::int IS NULL OR g.course_id = $2)
       LIMIT 1`,
      [req.user.id, assignment.course_id]
    );

    if (grpRes.rows.length === 0) {
      return res.status(400).json({ error: 'You are not part of a group for this assignment' });
    }

    const { id: groupId, leader_id } = grpRes.rows[0];
    if (leader_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: 'Only the group leader can acknowledge group submissions' });
    }

    const membersRes = await pool.query(
      'SELECT student_id FROM group_members WHERE group_id = $1',
      [groupId]
    );
    const updatedRows = [];
    for (const m of membersRes.rows) {
      const r = await pool.query(
        `INSERT INTO submissions (assignment_id, student_id, group_id, status, submitted_at, acknowledged_by, acknowledged_at)
         VALUES ($1, $2, $3, 'acknowledged', NOW(), $4, NOW())
         ON CONFLICT (assignment_id, student_id)
         DO UPDATE SET group_id = $3, status = 'acknowledged', acknowledged_by = $4, acknowledged_at = NOW()
         RETURNING *`,
        [assignmentId, m.student_id, groupId, req.user.id]
      );
      updatedRows.push(r.rows[0]);
    }

    res.json({
      message: 'Group submission acknowledged for all members!',
      submissions: updatedRows,
    });
  } catch (err) {
    console.error('Acknowledge error:', err);
    res.status(500).json({ error: 'Failed to acknowledge submission' });
  }
});

// Professor filtered submission list (?status=pending|submitted|acknowledged)
app.get('/api/assignments/:id/submissions', auth, async (req, res) => {
  if (!isProfessor(req.user.role)) {
    return res.status(403).json({ error: 'Professor access required' });
  }
  const { status } = req.query;
  try {
    let query = `
      SELECT s.*, u.name AS student_name, u.email AS student_email, g.name AS group_name
      FROM submissions s
      JOIN users u ON u.id = s.student_id
      LEFT JOIN groups g ON g.id = s.group_id
      WHERE s.assignment_id = $1
    `;
    const params = [req.params.id];
    if (status && ['pending', 'submitted', 'acknowledged'].includes(status.toLowerCase())) {
      params.push(status.toLowerCase());
      query += ` AND s.status = $${params.length}`;
    }
    query += ' ORDER BY u.name ASC';
    const { rows } = await pool.query(query, params);
    res.json({ submissions: rows });
  } catch (err) {
    console.error('Get submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// PDF upload endpoint
app.post('/api/submissions', auth, upload.single('pdf'), async (req, res) => {
  const { assignment_id, group_id } = req.body;
  if (!assignment_id || !req.file) {
    return res.status(400).json({ error: 'Assignment and PDF file are required' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  try {
    const result = await pool.query(
      `INSERT INTO submissions (assignment_id, student_id, group_id, status, submitted_at)
       VALUES ($1, $2, $3, 'submitted', NOW())
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET group_id = COALESCE($3, submissions.group_id), status = 'submitted', submitted_at = NOW()
       RETURNING *`,
      [assignment_id, req.user.id, group_id || null]
    );
    res.status(201).json({ submission: { ...result.rows[0], file_url: fileUrl } });
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ error: 'Failed to submit PDF' });
  }
});

app.get('/api/dashboard/progress', auth, async (req, res) => {
  if (!isProfessor(req.user.role)) {
    return res.status(403).json({ error: 'Professor access required' });
  }
  try {
    const subsRes = await pool.query('SELECT COUNT(*)::int AS count FROM submissions');
    res.json({ total_submissions: subsRes.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard progress' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));