
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

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role = 'student' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashed, role === 'admin' ? 'admin' : 'student']
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
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
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

app.get('/api/groups', auth, async (req, res) => {
  try {
    let groupsRes;
    if (req.user.role === 'admin') {
      groupsRes = await pool.query('SELECT * FROM groups ORDER BY id DESC');
    } else {
      groupsRes = await pool.query(
        `SELECT g.* FROM groups g
         JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = $1
         ORDER BY g.id DESC`,
        [req.user.id]
      );
    }

    const groups = [];
    for (const g of groupsRes.rows) {
      const membersRes = await pool.query(
        `SELECT u.id, u.name, u.email FROM users u
         JOIN group_members gm ON u.id = gm.user_id
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
  const { name, memberIds = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name is required' });

  try {
    const groupRes = await pool.query(
      'INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );
    const group = groupRes.rows[0];
    const allMemberIds = Array.from(new Set([req.user.id, ...memberIds]));
    for (const uid of allMemberIds) {
      await pool.query(
        'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
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
    const userRes = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'No student found with that email' });
    }
    const targetUser = userRes.rows[0];
    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
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
    const memberCheck = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (req.user.role !== 'admin' && memberCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this group' });
    }
    await pool.query('DELETE FROM groups WHERE id = $1', [req.params.id]);
    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

app.get('/api/assignments', auth, async (req, res) => {
  try {
    const assignmentsRes = await pool.query('SELECT * FROM assignments ORDER BY due_date ASC');
    const groupsCountRes = await pool.query('SELECT COUNT(*)::int AS count FROM groups');
    const totalGroups = groupsCountRes.rows[0].count;

    const assignments = [];
    for (const a of assignmentsRes.rows) {
      const subsRes = await pool.query('SELECT * FROM submissions WHERE assignment_id = $1', [a.id]);
      const submittedCount = subsRes.rows.length;
      const pct = totalGroups > 0 ? Math.round((submittedCount / totalGroups) * 100) : 0;
      assignments.push({
        ...a,
        submissions: subsRes.rows,
        submitted_groups_count: submittedCount,
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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only professors can create assignments' });
  }
  const { title, description, due_date } = req.body;
  if (!title || !due_date) {
    return res.status(400).json({ error: 'Title and due date are required' });
  }
  const fileUrl = req.file
    ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    : null;
  try {
    const result = await pool.query(
      'INSERT INTO assignments (title, description, due_date, created_by, file_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description || '', due_date, req.user.id, fileUrl]
    );
    res.status(201).json({ assignment: result.rows[0] });
  } catch (err) {
    console.error('Create assignment error:', err);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

app.post('/api/submissions', auth, upload.single('pdf'), async (req, res) => {
  const { assignment_id, group_id } = req.body;
  if (!assignment_id || !group_id || !req.file) {
    return res.status(400).json({ error: 'Assignment, group, and PDF file are required' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  try {
    const result = await pool.query(
      `INSERT INTO submissions (assignment_id, group_id, confirmed_by, file_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (assignment_id, group_id)
       DO UPDATE SET confirmed_by = $3, file_url = $4, submitted_at = NOW()
       RETURNING *`,
      [assignment_id, group_id, req.user.id, fileUrl]
    );
    res.status(201).json({ submission: result.rows[0] });
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ error: 'Failed to submit PDF' });
  }
});

app.get('/api/dashboard/progress', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
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