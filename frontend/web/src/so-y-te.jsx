import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './css/so-y-te.css';

const API_BASE_URL = "http://127.0.0.1:8000";

const SoYTe = () => {
    const [articles, setArticles] = useState([]);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [viewHistory, setViewHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_BASE_URL}/knowledge/`);
                
                if (res.data && res.data.articles && res.data.articles.length > 0) {
                    // Tùy chọn: Bạn có thể lọc bỏ những bài viết có is_active = false ở đây nếu cần
                    setArticles(res.data.articles);
                    await fetchArticleDetail(res.data.articles[0].id);
                } else {
                    setError("Chưa có dữ liệu sổ y tế trên hệ thống.");
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                setError("Lỗi kết nối đến máy chủ khi tải danh sách sổ y tế.");
                setLoading(false);
            }
        };

        fetchArticles();
    }, []);

    const fetchArticleDetail = async (id) => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/knowledge/${id}`);
            setSelectedArticle(res.data);
            
            // Thêm vào lịch sử xem
            setViewHistory(prev => {
                const filtered = prev.filter(h => h.id !== id);
                return [{ id, name: res.data.name, timestamp: Date.now() }, ...filtered].slice(0, 10);
            });
        } catch (err) {
            console.error(err);
            setError("Lỗi khi tải chi tiết bài viết.");
        } finally {
            setLoading(false);
        }
    };

    // Lấy danh sách danh mục
    const categories = useMemo(() => {
        const cats = [...new Set(articles.map(a => a.category).filter(Boolean))];
        return ['all', ...cats];
    }, [articles]);

    // Lọc và tìm kiếm bài viết
    const filteredArticles = useMemo(() => {
        return articles.filter(article => {
            const matchesSearch = article.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 (article.category && article.category.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [articles, searchQuery, selectedCategory]);

    if (error) {
        return (
            <div className="syt-container" style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> {error}
            </div>
        );
    }

    return (
        <div className="syt-page">
            {/* Header */}
            <header className="syt-header">
                <div className="syt-header-mesh">
                    <div className="syt-mesh-blob syt-mesh-blob--1"></div>
                    <div className="syt-mesh-blob syt-mesh-blob--2"></div>
                </div>
                <div className="syt-header-inner">
                    <div className="syt-header-text">
                        <div className="syt-breadcrumb">
                            <i className="fa-solid fa-heart-pulse"></i> Sổ Y Tế Điện Tử
                        </div>
                        <h1 className="syt-page-title">Kiến Thức <em>Sức Khỏe</em></h1>
                        <p className="syt-page-desc">Khám phá tài liệu y tế chi tiết, công thức tính toán sức khỏe và khuyến nghị từ các chuyên gia</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="syt-body">
                {/* Sidebar */}
                <aside className="syt-sidebar">
                    {/* Search & Filters */}
                    <div className="syt-search-section">
                        <div className="syt-search-box">
                            <i className="fa-solid fa-magnifying-glass"></i>
                            <input
                                type="text"
                                placeholder="Tìm kiếm bài viết..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="syt-search-input"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="syt-filter-section">
                            <h3 className="syt-filter-title">Danh Mục</h3>
                            <div className="syt-category-pills">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        className={`syt-category-pill ${selectedCategory === cat ? 'syt-category-pill--active' : ''}`}
                                        onClick={() => setSelectedCategory(cat)}
                                    >
                                        {cat === 'all' ? 'Tất cả' : cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* View History Toggle */}
                        {viewHistory.length > 0 && (
                            <button
                                className={`syt-history-toggle ${showHistory ? 'syt-history-toggle--active' : ''}`}
                                onClick={() => setShowHistory(!showHistory)}
                            >
                                <i className="fa-solid fa-clock"></i> Lịch sử xem ({viewHistory.length})
                            </button>
                        )}
                    </div>

                    {/* Article List */}
                    <div className="syt-list-section">
                        <h2 className="syt-sidebar-title">
                            <i className="fa-solid fa-book-medical"></i> {showHistory ? 'Lịch sử' : 'Danh sách'}
                        </h2>
                        
                        <ul className="syt-article-list">
                            {(showHistory ? viewHistory : filteredArticles).map((item) => (
                                <li
                                    key={item.id}
                                    className={`syt-article-item ${selectedArticle?.id === item.id ? 'syt-article-item--active' : ''}`}
                                    onClick={() => fetchArticleDetail(item.id)}
                                >
                                    <div className="syt-item-icon">
                                        <i className="fa-solid fa-file-lines"></i>
                                    </div>
                                    <div className="syt-item-content">
                                        <div className="syt-item-name">{item.name}</div>
                                        {!showHistory && item.category && <div className="syt-item-category">{item.category}</div>}
                                        {showHistory && <div className="syt-item-time">{new Date(item.timestamp).toLocaleDateString('vi-VN')}</div>}
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {filteredArticles.length === 0 && !showHistory && (
                            <div className="syt-empty-state">
                                <i className="fa-solid fa-inbox"></i>
                                <p>Không tìm thấy bài viết phù hợp</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="syt-main">
                    {loading ? (
                        <div className="syt-loading-state">
                            <div className="syt-spinner">
                                <i className="fa-solid fa-spinner fa-spin"></i>
                            </div>
                            <p>Đang tải dữ liệu...</p>
                        </div>
                    ) : selectedArticle ? (
                        <article className="syt-article-detail">
                            {/* Header */}
                            <header className="syt-detail-header">
                                {selectedArticle.category && <div className="syt-detail-badge">{selectedArticle.category}</div>}
                                <h1 className="syt-detail-title">{selectedArticle.name}</h1>
                                
                                {/* Siêu dữ liệu (Badges) */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px', marginBottom: '16px' }}>
                                    {selectedArticle.unit && (
                                        <span style={{ padding: '4px 10px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                                            <i className="fa-solid fa-ruler"></i> Đơn vị: {selectedArticle.unit}
                                        </span>
                                    )}
                                    {selectedArticle.indicator_type === 'calculated' && (
                                        <span style={{ padding: '4px 10px', backgroundColor: '#fef08a', color: '#854d0e', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                                            <i className="fa-solid fa-calculator"></i> Công thức tính
                                        </span>
                                    )}
                                    {selectedArticle.usable_for_assessment && (
                                        <span style={{ padding: '4px 10px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                                            <i className="fa-solid fa-robot"></i> Hỗ trợ AI đánh giá
                                        </span>
                                    )}
                                </div>

                                <p className="syt-detail-summary" style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6' }}>{selectedArticle.summary}</p>
                            </header>

                            {/* Content Sections */}
                            <div className="syt-detail-body">
                                
                                {/* Tầm quan trọng */}
                                {selectedArticle.importance && (
                                    <section className="syt-section">
                                        <h2 className="syt-section-title" style={{ color: '#0f172a' }}>
                                            <i className="fa-solid fa-lightbulb" style={{ color: '#eab308' }}></i> Ý Nghĩa & Tầm Quan Trọng
                                        </h2>
                                        <p className="syt-section-content" style={{ fontWeight: '500', color: '#334155' }}>
                                            {selectedArticle.importance}
                                        </p>
                                    </section>
                                )}

                                {/* Mô tả */}
                                <section className="syt-section">
                                    <h2 className="syt-section-title">
                                        <i className="fa-solid fa-circle-info"></i> Mô Tả Chi Tiết
                                    </h2>
                                    <p className="syt-section-content" style={{ whiteSpace: 'pre-line' }}>{selectedArticle.description}</p>
                                </section>

                                {/* Công thức & Biến số */}
                                {selectedArticle.indicator_type === 'calculated' && selectedArticle.formula && (
                                    <section className="syt-section">
                                        <div className="syt-formula-box" style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', padding: '20px', borderRadius: '8px' }}>
                                            <div className="syt-formula-label" style={{ fontWeight: 'bold', marginBottom: '10px', color: '#0f172a' }}>
                                                <i className="fa-solid fa-square-root-variable"></i> Công Thức Tính Toán
                                            </div>
                                            
                                            {selectedArticle.required_inputs && selectedArticle.required_inputs.length > 0 && (
                                                <div style={{ marginBottom: '12px', fontSize: '14px', color: '#475569' }}>
                                                    <strong>Tham số đầu vào: </strong>
                                                    {selectedArticle.required_inputs.map((inp, i) => (
                                                        <span key={i} style={{ display: 'inline-block', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', marginRight: '6px', fontSize: '12px', fontFamily: 'monospace' }}>
                                                            {inp}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            <code className="syt-formula-code" style={{ display: 'block', backgroundColor: '#1e293b', color: '#38bdf8', padding: '15px', borderRadius: '6px', fontSize: '16px', overflowX: 'auto' }}>
                                                {selectedArticle.formula}
                                            </code>
                                        </div>
                                    </section>
                                )}

                                {/* Normal Ranges */}
                                {selectedArticle.normal_ranges && selectedArticle.normal_ranges.length > 0 && (
                                    <section className="syt-section">
                                        <h2 className="syt-section-title">
                                            <i className="fa-solid fa-chart-line"></i> Ngưỡng Chỉ Số Phân Loại
                                        </h2>
                                        <div className="syt-ranges-grid">
                                            {selectedArticle.normal_ranges.map((range, idx) => (
                                                <div key={idx} className="syt-range-card">
                                                    <div className="syt-range-label">{range.label}</div>
                                                    <div className="syt-range-value">
                                                        {range.min !== null ? range.min : '∞'} – {range.max !== null ? range.max : '∞'} {selectedArticle.unit}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Recommendations */}
                                {selectedArticle.recommendations && selectedArticle.recommendations.length > 0 && (
                                    <section className="syt-section">
                                        <h2 className="syt-section-title">
                                            <i className="fa-solid fa-star-of-life"></i> Lời Khuyên & Khuyến Nghị
                                        </h2>
                                        <div className="syt-recommendations">
                                            {selectedArticle.recommendations.map((rec, idx) => (
                                                <div key={idx} className="syt-rec-item">
                                                    <span className="syt-rec-num">{idx + 1}</span>
                                                    <span className="syt-rec-text">{rec}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Related Diseases */}
                                {selectedArticle.related_diseases && selectedArticle.related_diseases.length > 0 && (
                                    <section className="syt-section">
                                        <h2 className="syt-section-title">
                                            <i className="fa-solid fa-link"></i> Bệnh Lý Liên Quan
                                        </h2>
                                        <div className="syt-disease-tags">
                                            {selectedArticle.related_diseases.map((disease, idx) => (
                                                <span key={idx} className="syt-disease-tag">{disease}</span>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Hình ảnh minh họa */}
                                {selectedArticle.images && selectedArticle.images.length > 0 && (
                                    <section className="syt-section">
                                        <h2 className="syt-section-title">
                                            <i className="fa-solid fa-images"></i> Hình Ảnh Minh Họa
                                        </h2>
                                        <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                                            {selectedArticle.images.map((img, idx) => (
                                                <img 
                                                    key={idx} 
                                                    src={img} 
                                                    alt={`Minh họa ${idx + 1}`} 
                                                    style={{ height: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} 
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Nguồn tham khảo */}
                                {selectedArticle.source && (
                                    <section className="syt-section" style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                                        <div style={{ padding: '15px', backgroundColor: '#f1f5f9', borderRadius: '8px', borderLeft: '4px solid #94a3b8', fontSize: '14px', color: '#475569' }}>
                                            <strong><i className="fa-solid fa-book-open"></i> Nguồn tài liệu tham khảo: </strong> 
                                            {selectedArticle.source}
                                        </div>
                                    </section>
                                )}

                            </div>
                        </article>
                    ) : (
                        <div className="syt-empty-content">
                            <div className="syt-empty-icon">
                                <i className="fa-solid fa-hand-pointer"></i>
                            </div>
                            <h3>Chọn một bài viết</h3>
                            <p>Nhấp vào bài viết bên trái để xem nội dung chi tiết</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SoYTe;