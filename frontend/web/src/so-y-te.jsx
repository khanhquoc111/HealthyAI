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
        const cats = [...new Set(articles.map(a => a.category))];
        return ['all', ...cats];
    }, [articles]);

    // Lọc và tìm kiếm bài viết
    const filteredArticles = useMemo(() => {
        return articles.filter(article => {
            const matchesSearch = article.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 article.category.toLowerCase().includes(searchQuery.toLowerCase());
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
                                        {!showHistory && <div className="syt-item-category">{item.category}</div>}
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
                                <div className="syt-detail-badge">{selectedArticle.category}</div>
                                <h1 className="syt-detail-title">{selectedArticle.name}</h1>
                                <p className="syt-detail-summary">{selectedArticle.summary}</p>
                            </header>

                            {/* Content Sections */}
                            <div className="syt-detail-body">
                                {/* Description */}
                                <section className="syt-section">
                                    <h2 className="syt-section-title">
                                        <i className="fa-solid fa-circle-info"></i> Mô Tả Chi Tiết
                                    </h2>
                                    <p className="syt-section-content">{selectedArticle.description}</p>
                                </section>

                                {/* Formula */}
                                {selectedArticle.formula && (
                                    <section className="syt-section">
                                        <div className="syt-formula-box">
                                            <div className="syt-formula-label">
                                                <i className="fa-solid fa-calculator"></i> Công Thức Tính
                                            </div>
                                            <code className="syt-formula-code">{selectedArticle.formula}</code>
                                        </div>
                                    </section>
                                )}

                                {/* Normal Ranges */}
                                {selectedArticle.normal_ranges && selectedArticle.normal_ranges.length > 0 && (
                                    <section className="syt-section">
                                        <h2 className="syt-section-title">
                                            <i className="fa-solid fa-chart-line"></i> Ngưỡng Chỉ Số Bình Thường
                                        </h2>
                                        <div className="syt-ranges-grid">
                                            {selectedArticle.normal_ranges.map((range, idx) => (
                                                <div key={idx} className="syt-range-card">
                                                    <div className="syt-range-label">{range.label}</div>
                                                    <div className="syt-range-value">
                                                        {range.min !== null ? range.min : '∞'} – {range.max !== null ? range.max : '∞'}
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