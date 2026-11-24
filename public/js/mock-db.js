const DEFAULT_USERS = [
    { id: 1, username: 'admin', password: '1', full_name: 'Quản trị viên TLU', role: 'admin', age: 30, address: 'Nghiêm Xuân Yêm, Hà Nội' },
    { id: 2, username: 'staff', password: '1', full_name: 'Nhân viên Thư viện', role: 'staff', age: 26, address: 'Thanh Xuân, Hà Nội' },
    { id: 3, username: 'user1', password: '1', full_name: 'Sinh viên A40001', role: 'user', age: 20, address: 'Hoàng Mai, Hà Nội' }
];

const DEFAULT_BOOKS = [
    {
        id: 1,
        title: "Giáo trình Lập trình C++",
        author: "Nguyễn Văn An",
        type: "giaotrinh",
        typeLabel: "Giáo trình học tập",
        category: "CNTT",
        isbn: "TLU-GT01",
        total_qty: 5,
        available_qty: 5,
        image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=600"
    },
    {
        id: 2,
        title: "Giáo trình Nguyên lý Kinh tế Vi mô",
        author: "Phạm Thị Lan",
        type: "giaotrinh",
        typeLabel: "Giáo trình học tập",
        category: "Kinh tế",
        isbn: "TLU-GT02",
        total_qty: 6,
        available_qty: 6,
        image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600"
    },
    {
        id: 3,
        title: "Cẩm nang Cấu trúc dữ liệu & Giải thuật",
        author: "Trần Minh Tuấn",
        type: "thamkhao",
        typeLabel: "Tài liệu tham khảo",
        category: "CNTT",
        isbn: "TLU-TK01",
        total_qty: 4,
        available_qty: 4,
        image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600"
    },
    {
        id: 4,
        title: "Phương pháp Nghiên cứu Khoa học",
        author: "Đỗ Quốc Hưng",
        type: "thamkhao",
        typeLabel: "Tài liệu tham khảo",
        category: "Kinh tế",
        isbn: "TLU-TK02",
        total_qty: 5,
        available_qty: 3,
        image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600"
    },
    {
        id: 5,
        title: "Kiến trúc Hệ quản trị Cơ sở dữ liệu",
        author: "Lê Hoàng Nam",
        type: "chuyennganh",
        typeLabel: "Sách chuyên ngành",
        category: "CNTT",
        isbn: "TLU-CN01",
        total_qty: 3,
        available_qty: 3,
        image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600"
    },
    {
        id: 6,
        title: "Phân tích Tài chính Doanh nghiệp Chuyên sâu",
        author: "Vũ Đình Khôi",
        type: "chuyennganh",
        typeLabel: "Sách chuyên ngành",
        category: "Kinh tế",
        isbn: "TLU-CN02",
        total_qty: 4,
        available_qty: 2,
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600"
    },
    {
        id: 7,
        title: "Tiếng Anh Chuyên ngành Công nghệ Thông tin",
        author: "Hoàng Mai Anh",
        type: "chuyennganh",
        typeLabel: "Sách chuyên ngành",
        category: "Ngoại ngữ",
        isbn: "TLU-CN03",
        total_qty: 5,
        available_qty: 5,
        image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600"
    }
];

function getLocalUsers() {
    const saved = localStorage.getItem('tlu_users_db');
    if (!saved) {
        localStorage.setItem('tlu_users_db', JSON.stringify(DEFAULT_USERS));
        return [...DEFAULT_USERS];
    }
    return JSON.parse(saved);
}

function saveLocalUsers(users) {
    localStorage.setItem('tlu_users_db', JSON.stringify(users));
}

function getLocalBooks() {
    const saved = localStorage.getItem('tlu_books_db');
    if (!saved) {
        localStorage.setItem('tlu_books_db', JSON.stringify(DEFAULT_BOOKS));
        return [...DEFAULT_BOOKS];
    }
    return JSON.parse(saved);
}

function saveLocalBooks(books) {
    localStorage.setItem('tlu_books_db', JSON.stringify(books));
}

function getLocalBorrows() {
    return JSON.parse(localStorage.getItem('tlu_borrows_db') || '[]');
}

function saveLocalBorrows(borrows) {
    localStorage.setItem('tlu_borrows_db', JSON.stringify(borrows));
}

function calcFineLocal(dueDateStr, checkDateStr) {
    const due = new Date(`${dueDateStr}T00:00:00`);
    const actual = new Date(`${checkDateStr}T00:00:00`);
    const diff = actual - due;
    const overdueDays = diff > 0 ? Math.ceil(diff / 86400000) : 0;
    return { overdueDays, fineAmount: overdueDays * 5000 };
}

const DEFAULT_NEWS = [
    {
        id: 1,
        title: "Workshop: Kỹ năng tra cứu học liệu số & Trích dẫn tài liệu NCKH",
        category: "hoatdong",
        categoryLabel: "Hoạt động thư viện",
        date: "2026-11-20",
        author: "Ban Quản lý Thư viện",
        image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=700",
        summary: "Hướng dẫn sinh viên khai thác hiệu quả kho giáo trình, tài liệu tham khảo và cách trích dẫn chuẩn khi làm khóa luận tốt nghiệp.",
        content: "Nhằm hỗ trợ sinh viên các khóa chuẩn bị làm đồ án môn học và khóa luận tốt nghiệp, Thư viện Đại học Thăng Long tổ chức buổi hướng dẫn thực hành tra cứu tài liệu chuyên ngành.\n\nNội dung chính:\n1. Cách tìm kiếm và đặt mượn giáo trình trực tuyến trên hệ thống thư viện.\n2. Kỹ năng lọc tài liệu tham khảo uy tín và quản lý danh mục tài liệu trích dẫn.\n3. Giải đáp trực tiếp các thắc mắc về quy định sử dụng phòng tự học và phòng thảo luận nhóm.\n\nĐịa điểm: Phòng Hội thảo tầng 2 - Thư viện TLU."
    },
    {
        id: 2,
        title: "Ngày hội Đọc sách & Trao đổi Giáo trình cũ học kỳ I",
        category: "vanhoadoc",
        categoryLabel: "Văn hóa đọc",
        date: "2026-11-15",
        author: "CLB Sách TLU",
        image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=700",
        summary: "Không gian giao lưu, chia sẻ những cuốn sách hay và quyên góp giáo trình giữa các khóa sinh viên trong toàn trường.",
        content: "Sự kiện Ngày hội Đọc sách là hoạt động thường niên nhằm lan tỏa thói quen tự học, đọc sách chuyên sâu và kết nối cộng đồng yêu sách tại Đại học Thăng Long.\n\nSinh viên tham gia có thể mang theo giáo trình hoặc sách kỹ năng đã học xong để trao đổi lấy các đầu sách mới, đồng thời tham gia góc bình chọn những cuốn sách truyền cảm hứng nhất trong tháng."
    },
    {
        id: 3,
        title: "Thông báo lịch mở cửa phục vụ ôn thi cuối kỳ & Quy định hạn trả sách",
        category: "thongbao",
        categoryLabel: "Thông báo mới",
        date: "2026-11-22",
        author: "Quản trị viên TLU",
        image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=700",
        summary: "Thư viện kéo dài thời gian mở cửa khu tự học đến 21h00 các ngày trong tuần và lưu ý thời hạn trả sách 14 ngày.",
        content: "Để tạo điều kiện tốt nhất cho sinh viên ôn tập thi kết thúc học phần, Thư viện thông báo điều chỉnh lịch phục vụ như sau:\n\n- Khu tự học yên tĩnh (Silent Zone): Mở cửa từ 07:30 đến 21:00 (Thứ 2 – Thứ 7).\n- Quầy mượn trả sách trực tiếp: 08:00 – 17:30.\n- Lưu ý: Mỗi lượt mượn sách có thời hạn tiêu chuẩn 14 ngày. Bạn đọc vui lòng kiểm tra mục 'Sách đang mượn' trên tài khoản cá nhân để trả sách đúng hạn, tránh phát sinh phí quá hạn 5.000đ/ngày."
    }
];

function getLocalNews() {
    const saved = localStorage.getItem('tlu_news_db');
    if (!saved) {
        localStorage.setItem('tlu_news_db', JSON.stringify(DEFAULT_NEWS));
        return [...DEFAULT_NEWS];
    }
    return JSON.parse(saved);
}

function saveLocalNews(newsList) {
    localStorage.setItem('tlu_news_db', JSON.stringify(newsList));
}