const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LOAN_DAYS = 14;
const FINE_PER_DAY = 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình kết nối MySQL (tạo sẵn database tlu_library trong MySQL hoặc truyền biến môi trường)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tlu_library',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10
});

function formatDate(d) {
    return d.toISOString().slice(0, 10);
}

function calcOverdueAndFine(dueDateStr, checkDateStr) {
    const due = new Date(`${dueDateStr}T00:00:00Z`);
    const actual = new Date(`${checkDateStr}T00:00:00Z`);
    const diffMs = actual - due;
    const overdueDays = diffMs > 0 ? Math.ceil(diffMs / 86400000) : 0;
    return { overdueDays, fineAmount: overdueDays * FINE_PER_DAY };
}

async function initDatabase() {
    const conn = await pool.getConnection();
    try {
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(150) NOT NULL,
                role ENUM('user', 'staff', 'admin') NOT NULL DEFAULT 'user',
                age INT NULL,
                address VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Bổ sung cột age, address nếu bảng users đã tồn tại từ trước
        try { await conn.query(`ALTER TABLE users ADD COLUMN age INT NULL`); } catch (e) {}
        try { await conn.query(`ALTER TABLE users ADD COLUMN address VARCHAR(255) NULL`); } catch (e) {}

        await conn.query(`
            CREATE TABLE IF NOT EXISTS books (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                author VARCHAR(150) NOT NULL,
                type VARCHAR(50) NOT NULL DEFAULT 'giaotrinh',
                type_label VARCHAR(100) NOT NULL DEFAULT 'Giáo trình học tập',
                category VARCHAR(100) NOT NULL,
                isbn VARCHAR(50),
                image VARCHAR(500),
                total_qty INT NOT NULL DEFAULT 1,
                available_qty INT NOT NULL DEFAULT 1
            )
        `);

        try { await conn.query(`ALTER TABLE books ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'giaotrinh'`); } catch (e) {}
        try { await conn.query(`ALTER TABLE books ADD COLUMN type_label VARCHAR(100) NOT NULL DEFAULT 'Giáo trình học tập'`); } catch (e) {}

        await conn.query(`
            CREATE TABLE IF NOT EXISTS borrow_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                book_id INT NOT NULL,
                borrow_date DATE NOT NULL,
                due_date DATE NOT NULL,
                return_date DATE NULL,
                overdue_days INT NOT NULL DEFAULT 0,
                fine_amount INT NOT NULL DEFAULT 0,
                status ENUM('borrowing', 'returned') NOT NULL DEFAULT 'borrowing',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
            )
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS book_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                book_id INT NOT NULL,
                rating INT NOT NULL DEFAULT 5,
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
            )
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS book_suggestions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_name VARCHAR(150) NOT NULL,
                book_title VARCHAR(255) NOT NULL,
                author VARCHAR(150),
                reason TEXT,
                status ENUM('pending', 'approved') NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS news_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(50) NOT NULL DEFAULT 'thongbao',
                category_label VARCHAR(100) NOT NULL DEFAULT 'Thông báo mới',
                post_date DATE NOT NULL,
                author VARCHAR(150) NOT NULL,
                image VARCHAR(500),
                summary TEXT NOT NULL,
                content TEXT NOT NULL
            )
        `);

        await conn.query(`
            INSERT IGNORE INTO users (username, password, full_name, role, age, address) VALUES
            ('admin', '1', 'Quản trị viên TLU', 'admin', 30, 'Nghiêm Xuân Yêm, Hà Nội'),
            ('staff', '1', 'Nhân viên Thư viện', 'staff', 26, 'Thanh Xuân, Hà Nội'),
            ('user1', '1', 'Sinh viên A40001', 'user', 20, 'Hoàng Mai, Hà Nội')
        `);

        const [rows] = await conn.query(`SELECT COUNT(*) AS cnt FROM books`);
        if (rows[0].cnt === 0) {
            await conn.query(`
                INSERT INTO books (title, author, type, type_label, category, isbn, image, total_qty, available_qty) VALUES
                ('Giáo trình Lập trình C++', 'Nguyễn Văn An', 'giaotrinh', 'Giáo trình học tập', 'CNTT', 'TLU-GT01', 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=600', 5, 5),
                ('Giáo trình Nguyên lý Kinh tế Vi mô', 'Phạm Thị Lan', 'giaotrinh', 'Giáo trình học tập', 'Kinh tế', 'TLU-GT02', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600', 6, 6),
                ('Cẩm nang Cấu trúc dữ liệu & Giải thuật', 'Trần Minh Tuấn', 'thamkhao', 'Tài liệu tham khảo', 'CNTT', 'TLU-TK01', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600', 4, 4),
                ('Phương pháp Nghiên cứu Khoa học', 'Đỗ Quốc Hưng', 'thamkhao', 'Tài liệu tham khảo', 'Kinh tế', 'TLU-TK02', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600', 5, 5),
                ('Kiến trúc Hệ quản trị Cơ sở dữ liệu', 'Lê Hoàng Nam', 'chuyennganh', 'Sách chuyên ngành', 'CNTT', 'TLU-CN01', 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600', 3, 3),
                ('Phân tích Tài chính Doanh nghiệp Chuyên sâu', 'Vũ Đình Khôi', 'chuyennganh', 'Sách chuyên ngành', 'Kinh tế', 'TLU-CN02', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600', 4, 4),
                ('Tiếng Anh Chuyên ngành Công nghệ Thông tin', 'Hoàng Mai Anh', 'chuyennganh', 'Sách chuyên ngành', 'Ngoại ngữ', 'TLU-CN03', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600', 5, 5)
            `);
        }

        const [newsRows] = await conn.query(`SELECT COUNT(*) AS cnt FROM news_posts`);
        if (newsRows[0].cnt === 0) {
            await conn.query(`
                INSERT INTO news_posts (title, category, category_label, post_date, author, image, summary, content) VALUES
                ('Workshop: Kỹ năng tra cứu học liệu số & Trích dẫn tài liệu NCKH', 'hoatdong', 'Hoạt động thư viện', '2026-11-20', 'Ban Quản lý Thư viện', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=700', 'Hướng dẫn sinh viên khai thác hiệu quả kho giáo trình, tài liệu tham khảo và cách trích dẫn chuẩn khi làm khóa luận tốt nghiệp.', 'Nhằm hỗ trợ sinh viên các khóa chuẩn bị làm đồ án môn học và khóa luận tốt nghiệp, Thư viện Đại học Thăng Long tổ chức buổi hướng dẫn thực hành tra cứu tài liệu chuyên ngành.'),
                ('Ngày hội Đọc sách & Trao đổi Giáo trình cũ học kỳ I', 'vanhoadoc', 'Văn hóa đọc', '2026-11-15', 'CLB Sách TLU', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=700', 'Không gian giao lưu, chia sẻ những cuốn sách hay và quyên góp giáo trình giữa các khóa sinh viên trong toàn trường.', 'Sự kiện Ngày hội Đọc sách là hoạt động thường niên nhằm lan tỏa thói quen tự học, đọc sách chuyên sâu và kết nối cộng đồng yêu sách tại Đại học Thăng Long.'),
                ('Thông báo lịch mở cửa phục vụ ôn thi cuối kỳ & Quy định hạn trả sách', 'thongbao', 'Thông báo mới', '2026-11-22', 'Quản trị viên TLU', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=700', 'Thư viện kéo dài thời gian mở cửa khu tự học đến 21h00 các ngày trong tuần và lưu ý thời hạn trả sách 14 ngày.', 'Khu tự học yên tĩnh (Silent Zone): Mở cửa từ 07:30 đến 21:00. Mỗi lượt mượn sách có thời hạn tiêu chuẩn 14 ngày, phí quá hạn 5.000đ/ngày.')
            `);
        }
    } finally {
        conn.release();
    }
}

async function attachUser(req, res, next) {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    const [users] = await pool.query(`SELECT id, username, full_name, role, age, address FROM users WHERE id = ?`, [userId]);
    if (!users.length) return res.status(401).json({ error: 'Tài khoản không hợp lệ' });
    req.currentUser = users[0];
    next();
}

function requireStaffOrAdmin(req, res, next) {
    if (req.currentUser.role !== 'admin' && req.currentUser.role !== 'staff') {
        return res.status(403).json({ error: 'Chỉ Nhân viên hoặc Admin mới có quyền này' });
    }
    next();
}

function requireAdminOnly(req, res, next) {
    if (req.currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ Admin mới có quyền quản lý nhân sự' });
    }
    next();
}

// --- AUTH & PROFILE ---
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [users] = await pool.query(
            `SELECT id, username, full_name, role, age, address FROM users WHERE username = ? AND password = ?`,
            [username, password]
        );
        if (!users.length) return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
        res.json({ user: users[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, full_name } = req.body;
        if (!username || !password || !full_name) {
            return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
        }
        const [result] = await pool.query(
            `INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, 'user')`,
            [username.trim(), password, full_name.trim()]
        );
        res.status(201).json({
            user: { id: result.insertId, username: username.trim(), full_name: full_name.trim(), role: 'user', age: null, address: '' }
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/profile', attachUser, async (req, res) => {
    res.json({ user: req.currentUser });
});

app.put('/api/profile', attachUser, async (req, res) => {
    try {
        const { full_name, age, address } = req.body;
        if (!full_name || !full_name.trim()) {
            return res.status(400).json({ error: 'Họ và tên không được để trống' });
        }
        const parsedAge = age ? parseInt(age, 10) : null;
        await pool.query(
            `UPDATE users SET full_name = ?, age = ?, address = ? WHERE id = ?`,
            [full_name.trim(), parsedAge, (address || '').trim(), req.currentUser.id]
        );
        const [rows] = await pool.query(`SELECT id, username, full_name, role, age, address FROM users WHERE id = ?`, [req.currentUser.id]);
        res.json({ message: 'Đã cập nhật thông tin tài khoản thành công!', user: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- QUẢN LÝ NHÂN SỰ (ADMIN) ---
app.get('/api/staff/users', attachUser, requireAdminOnly, async (req, res) => {
    const [rows] = await pool.query(`SELECT id, username, full_name, role, age, address FROM users ORDER BY id ASC`);
    res.json(rows);
});

app.post('/api/staff/users', attachUser, requireAdminOnly, async (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        if (!username || !password || !full_name || !['user', 'staff', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Dữ liệu nhân sự không hợp lệ' });
        }
        await pool.query(
            `INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)`,
            [username.trim(), password, full_name.trim(), role]
        );
        res.status(201).json({ message: 'Đã tạo tài khoản thành công' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/staff/users/:id/role', attachUser, requireAdminOnly, async (req, res) => {
    const { role } = req.body;
    if (!['user', 'staff', 'admin'].includes(role)) return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    await pool.query(`UPDATE users SET role = ? WHERE id = ?`, [role, req.params.id]);
    res.json({ message: 'Đã cập nhật vai trò' });
});

app.delete('/api/staff/users/:id', attachUser, requireAdminOnly, async (req, res) => {
    if (parseInt(req.params.id, 10) === req.currentUser.id) {
        return res.status(400).json({ error: 'Không thể tự xóa tài khoản đang đăng nhập' });
    }
    await pool.query(`DELETE FROM users WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Đã xóa tài khoản' });
});

// --- SÁCH ---
const TYPE_LABELS = {
    giaotrinh: 'Giáo trình học tập',
    thamkhao: 'Tài liệu tham khảo',
    chuyennganh: 'Sách chuyên ngành'
};

app.get('/api/books', async (req, res) => {
    const q = (req.query.q || '').trim().toLowerCase();
    const type = (req.query.type || '').trim();
    const category = (req.query.category || '').trim();
    let sql = `SELECT id, title, author, type, type_label AS typeLabel, category, isbn, image, total_qty, available_qty FROM books WHERE 1=1`;
    const params = [];

    if (q) {
        sql += ` AND (LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR LOWER(isbn) LIKE ?)`;
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (type && type !== 'ALL') {
        sql += ` AND type = ?`;
        params.push(type);
    }
    if (category && category !== 'ALL') {
        sql += ` AND category = ?`;
        params.push(category);
    }
    sql += ` ORDER BY id DESC`;

    const [books] = await pool.query(sql, params);
    res.json(books);
});

app.post('/api/books', attachUser, requireStaffOrAdmin, async (req, res) => {
    const { title, author, type, category, isbn, image, total_qty } = req.body;
    const qty = parseInt(total_qty, 10);
    if (!title || !author || !category || isNaN(qty) || qty < 1) {
        return res.status(400).json({ error: 'Dữ liệu sách không hợp lệ' });
    }
    const bookType = type || 'giaotrinh';
    const typeLabel = TYPE_LABELS[bookType] || 'Giáo trình học tập';
    const finalIsbn = (isbn || '').trim() || `TLU-${Date.now().toString().slice(-4)}`;
    const imgUrl = (image || '').trim() || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600';
    const [result] = await pool.query(
        `INSERT INTO books (title, author, type, type_label, category, isbn, image, total_qty, available_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title.trim(), author.trim(), bookType, typeLabel, category.trim(), finalIsbn, imgUrl, qty, qty]
    );
    const [rows] = await pool.query(`SELECT id, title, author, type, type_label AS typeLabel, category, isbn, image, total_qty, available_qty FROM books WHERE id = ?`, [result.insertId]);
    res.status(201).json(rows[0]);
});

app.delete('/api/books/:id', attachUser, requireStaffOrAdmin, async (req, res) => {
    const [active] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM borrow_records WHERE book_id = ? AND status = 'borrowing'`,
        [req.params.id]
    );
    if (active[0].cnt > 0) return res.status(400).json({ error: 'Không thể xóa sách đang có người mượn' });
    await pool.query(`DELETE FROM books WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Đã xóa sách thành công' });
});

// --- MƯỢN & TRẢ SÁCH ---
app.post('/api/borrow', async (req, res) => {
    const { user_id, book_id } = req.body;
    if (!user_id || !book_id) return res.status(400).json({ error: 'Thiếu thông tin mượn sách' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [books] = await conn.query(`SELECT * FROM books WHERE id = ? FOR UPDATE`, [book_id]);
        if (!books.length) {
            await conn.rollback();
            return res.status(404).json({ error: 'Sách không tồn tại' });
        }
        if (books[0].available_qty <= 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'Sách đã hết trong kho' });
        }

        await conn.query(`UPDATE books SET available_qty = available_qty - 1 WHERE id = ?`, [book_id]);

        const now = new Date();
        const borrowDate = formatDate(now);
        const dueDate = formatDate(new Date(now.getTime() + LOAN_DAYS * 86400000));

        await conn.query(
            `INSERT INTO borrow_records (user_id, book_id, borrow_date, due_date, status) VALUES (?, ?, ?, ?, 'borrowing')`,
            [user_id, book_id, borrowDate, dueDate]
        );

        await conn.commit();
        const [updated] = await conn.query(`SELECT * FROM books WHERE id = ?`, [book_id]);
        res.status(201).json({ message: `Mượn sách thành công! Hạn trả: ${dueDate}`, book: updated[0] });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

app.post('/api/return/:recordId', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [records] = await conn.query(`SELECT * FROM borrow_records WHERE id = ? FOR UPDATE`, [req.params.recordId]);
        if (!records.length || records[0].status === 'returned') {
            await conn.rollback();
            return res.status(400).json({ error: 'Phiếu mượn không hợp lệ hoặc đã trả' });
        }

        const record = records[0];
        const returnDate = formatDate(new Date());
        const dueDateStr = formatDate(new Date(record.due_date));
        const { overdueDays, fineAmount } = calcOverdueAndFine(dueDateStr, returnDate);

        await conn.query(
            `UPDATE borrow_records SET status = 'returned', return_date = ?, overdue_days = ?, fine_amount = ? WHERE id = ?`,
            [returnDate, overdueDays, fineAmount, record.id]
        );
        await conn.query(
            `UPDATE books SET available_qty = LEAST(total_qty, available_qty + 1) WHERE id = ?`,
            [record.book_id]
        );

        await conn.commit();
        const [updatedBook] = await conn.query(`SELECT * FROM books WHERE id = ?`, [record.book_id]);
        res.json({
            message: overdueDays > 0
                ? `Trả sách quá hạn ${overdueDays} ngày. Tiền phạt: ${fineAmount.toLocaleString('vi-VN')}đ`
                : 'Trả sách đúng hạn thành công!',
            book: updatedBook[0]
        });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

app.get('/api/borrows', async (req, res) => {
    const userId = req.query.userId;
    let sql = `
        SELECT br.id, br.user_id, br.book_id,
               DATE_FORMAT(br.borrow_date, '%Y-%m-%d') AS borrow_date,
               DATE_FORMAT(br.due_date, '%Y-%m-%d') AS due_date,
               DATE_FORMAT(br.return_date, '%Y-%m-%d') AS return_date,
               br.overdue_days, br.fine_amount, br.status,
               b.title AS book_title, b.type_label AS book_type_label, b.category AS book_category,
               u.full_name AS user_name, u.username
        FROM borrow_records br
        JOIN books b ON br.book_id = b.id
        JOIN users u ON br.user_id = u.id
    `;
    const params = [];
    if (userId) {
        sql += ` WHERE br.user_id = ?`;
        params.push(userId);
    }
    sql += ` ORDER BY br.id DESC`;

    const [rows] = await pool.query(sql, params);
    const todayStr = formatDate(new Date());
    const enriched = rows.map(r => {
        if (r.status === 'borrowing') {
            const { overdueDays, fineAmount } = calcOverdueAndFine(r.due_date, todayStr);
            return { ...r, preview_overdue_days: overdueDays, preview_fine: fineAmount };
        }
        return { ...r, preview_overdue_days: r.overdue_days, preview_fine: r.fine_amount };
    });
    res.json(enriched);
});

// --- TIN TỨC & SỰ KIỆN ---
const NEWS_CAT_LABELS = {
    hoatdong: 'Hoạt động thư viện',
    vanhoadoc: 'Văn hóa đọc',
    thongbao: 'Thông báo mới'
};

app.get('/api/news', async (req, res) => {
    try {
        const kw = (req.query.q || '').trim().toLowerCase();
        const cat = (req.query.category || '').trim();
        let sql = `SELECT id, title, category, category_label AS categoryLabel, DATE_FORMAT(post_date, '%Y-%m-%d') AS date, author, image, summary, content FROM news_posts WHERE 1=1`;
        const params = [];
        if (kw) {
            sql += ` AND (LOWER(title) LIKE ? OR LOWER(summary) LIKE ?)`;
            params.push(`%${kw}%`, `%${kw}%`);
        }
        if (cat && cat !== 'ALL') {
            sql += ` AND category = ?`;
            params.push(cat);
        }
        sql += ` ORDER BY id DESC`;
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/news', attachUser, requireStaffOrAdmin, async (req, res) => {
    try {
        const { title, category, summary, content } = req.body;
        if (!title || !summary) return res.status(400).json({ error: 'Vui lòng nhập tiêu đề và tóm tắt' });
        const cat = category || 'thongbao';
        const catLabel = NEWS_CAT_LABELS[cat] || 'Thông báo mới';
        const today = formatDate(new Date());
        await pool.query(
            `INSERT INTO news_posts (title, category, category_label, post_date, author, image, summary, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title.trim(), cat, catLabel, today, req.currentUser.full_name, 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=700', summary.trim(), (content || summary).trim()]
        );
        res.status(201).json({ message: 'Đã đăng bài viết mới thành công!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/news/:id', attachUser, requireStaffOrAdmin, async (req, res) => {
    try {
        await pool.query(`DELETE FROM news_posts WHERE id = ?`, [req.params.id]);
        res.json({ message: 'Đã xóa bài viết' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- LAN TỎA TRI THỨC: TOP SÁCH, REVIEW & ĐỀ XUẤT SÁCH ---
app.get('/api/books/top', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT b.*, COUNT(br.id) AS borrow_count
            FROM books b
            LEFT JOIN borrow_records br ON b.id = br.book_id
            GROUP BY b.id
            ORDER BY borrow_count DESC, b.id DESC
            LIMIT 4
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reviews', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT r.id, r.rating, r.comment,
                   DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i') AS created_at,
                   u.full_name, b.title AS book_title
            FROM book_reviews r
            JOIN users u ON r.user_id = u.id
            JOIN books b ON r.book_id = b.id
            ORDER BY r.id DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const { user_id, book_id, rating, comment } = req.body;
        const stars = parseInt(rating, 10);
        if (!user_id || !book_id || !comment || !comment.trim() || stars < 1 || stars > 5) {
            return res.status(400).json({ error: 'Vui lòng chọn sách và nhập nội dung cảm nhận' });
        }
        await pool.query(
            `INSERT INTO book_reviews (user_id, book_id, rating, comment) VALUES (?, ?, ?, ?)`,
            [user_id, book_id, stars, comment.trim()]
        );
        res.status(201).json({ message: 'Đã đăng cảm nhận sách thành công!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/suggestions', async (req, res) => {
    try {
        const { sender_name, book_title, author, reason } = req.body;
        if (!sender_name || !book_title || !sender_name.trim() || !book_title.trim()) {
            return res.status(400).json({ error: 'Vui lòng nhập họ tên và tên sách đề xuất' });
        }
        await pool.query(
            `INSERT INTO book_suggestions (sender_name, book_title, author, reason) VALUES (?, ?, ?, ?)`,
            [sender_name.trim(), book_title.trim(), (author || '').trim(), (reason || '').trim()]
        );
        res.status(201).json({ message: 'Đã gửi đề xuất bổ sung sách tới Ban quản lý thư viện!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/suggestions', attachUser, requireStaffOrAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, sender_name, book_title, author, reason, status,
                   DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
            FROM book_suggestions
            ORDER BY id DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/suggestions/:id/approve', attachUser, requireStaffOrAdmin, async (req, res) => {
    try {
        await pool.query(`UPDATE book_suggestions SET status = 'approved' WHERE id = ?`, [req.params.id]);
        res.json({ message: 'Đã duyệt đề xuất sách' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

initDatabase().then(() => {
    app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));
});
