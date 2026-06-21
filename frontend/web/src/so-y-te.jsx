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
    const [sortOrder, setSortOrder] = useState("recent");
    const [expandedSections, setExpandedSections] = useState({});

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
            
            setViewHistory(prev => {
                const filtered = prev.filter(h => h.id !== id);
                return [{ id, name: res.data.name, timestamp: Date.now() }, ...filtered].slice(0, 20);
            });
        } catch (err) {
            console.error(err);
            setError("Lỗi khi tải chi tiết bài viết.");
        } finally {
            setLoading(false);
        }
    };

    const categories = useMemo(() => {
        const cats = [...new Set(articles.map(a => a.category).filter(Boolean))];
        return ['all', ...cats];
    }, [articles]);

    const filteredArticles = useMemo(() => {
        let filtered = articles.filter(article => {
            const matchesSearch = article.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 (article.category && article.category.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        if (sortOrder === "alphabetical") {
            filtered = filtered.sort((a, b) => a.name.localeCompare(b.name, 'vi-VN'));
        }

        return filtered;
    }, [articles, searchQuery, selectedCategory, sortOrder]);

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const clearHistory = () => {
        if (confirm("Bạn có chắc muốn xóa lịch sử xem?")) {
            setViewHistory([]);
            setShowHistory(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery("");
    };

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
                            {searchQuery && (
                                <button 
                                    className="syt-search-clear"
                                    onClick={clearSearch}
                                    title="Xóa tìm kiếm"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            )}
                        </div>

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

                        <div className="syt-sort-section">
                            <h3 className="syt-filter-title">Sắp Xếp</h3>
                            <div className="syt-sort-buttons">
                                <button 
                                    className={`syt-sort-btn ${sortOrder === 'recent' ? 'syt-sort-btn--active' : ''}`}
                                    onClick={() => setSortOrder('recent')}
                                    title="Sắp xếp theo danh sách gốc"
                                >
                                    <i className="fa-solid fa-arrow-down-short-wide"></i> Mặc định
                                </button>
                                <button 
                                    className={`syt-sort-btn ${sortOrder === 'alphabetical' ? 'syt-sort-btn--active' : ''}`}
                                    onClick={() => setSortOrder('alphabetical')}
                                    title="Sắp xếp theo tên"
                                >
                                    <i className="fa-solid fa-arrow-down-a-z"></i> A-Z
                                </button>
                            </div>
                        </div>

                        {viewHistory.length > 0 && (
                            <button
                                className={`syt-history-toggle ${showHistory ? 'syt-history-toggle--active' : ''}`}
                                onClick={() => setShowHistory(!showHistory)}
                            >
                                <i className="fa-solid fa-clock"></i> Lịch sử ({viewHistory.length})
                            </button>
                        )}
                    </div>

                    <div className="syt-list-section">
                        <div className="syt-sidebar-header">
                            <h2 className="syt-sidebar-title">
                                <i className={`fa-solid ${showHistory ? 'fa-history' : 'fa-list'}`}></i> 
                                {showHistory ? 'Lịch sử xem' : 'Danh sách'}
                            </h2>
                            {showHistory && viewHistory.length > 0 && (
                                <button 
                                    className="syt-clear-history-btn"
                                    onClick={clearHistory}
                                    title="Xóa lịch sử"
                                >
                                    <i className="fa-solid fa-trash-can"></i>
                                </button>
                            )}
                        </div>

                        {(showHistory ? viewHistory : filteredArticles).length > 0 ? (
                            <ul className="syt-article-list">
                                {(showHistory ? viewHistory : filteredArticles).map((item) => (
                                    <li
                                        key={item.id}
                                        className={`syt-article-item ${selectedArticle?.id === item.id ? 'syt-article-item--active' : ''}`}
                                        onClick={() => fetchArticleDetail(item.id)}
                                    >
                                        <div className="syt-item-icon">
                                            <i className={`fa-solid ${showHistory ? 'fa-clock' : 'fa-file-lines'}`}></i>
                                        </div>
                                        <div className="syt-item-content">
                                            <div className="syt-item-name">{item.name}</div>
                                            {!showHistory && item.category && <div className="syt-item-category">{item.category}</div>}
                                            {showHistory && <div className="syt-item-time">
                                                {new Date(item.timestamp).toLocaleDateString('vi-VN')} {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </div>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="syt-empty-state">
                                <i className={`fa-solid ${showHistory ? 'fa-inbox' : 'fa-search'}`}></i>
                                <p>{showHistory ? 'Chưa có lịch sử xem' : 'Không tìm thấy bài viết'}</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="syt-main">
                    {loading ? (
                        <div className="syt-loading-state">
                            <div className="syt-spinner">
                                <i className="fa-solid fa-spinner"></i>
                            </div>
                            <p>Đang tải dữ liệu...</p>
                        </div>
                    ) : selectedArticle ? (
                        <article className="syt-article-detail">
                            <header className="syt-detail-header">
                                {selectedArticle.category && <div className="syt-detail-badge">{selectedArticle.category}</div>}
                                <h1 className="syt-detail-title">{selectedArticle.name}</h1>
                                
                                <div className="syt-detail-meta">
                                    {selectedArticle.unit && (
                                        <span className="syt-meta-badge syt-meta-unit">
                                            <i className="fa-solid fa-ruler"></i> Đơn vị: {selectedArticle.unit}
                                        </span>
                                    )}
                                    {selectedArticle.indicator_type === 'calculated' && (
                                        <span className="syt-meta-badge syt-meta-formula">
                                            <i className="fa-solid fa-calculator"></i> Công thức tính
                                        </span>
                                    )}
                                </div>

                                {selectedArticle.summary && <p className="syt-detail-summary">{selectedArticle.summary}</p>}
                            </header>

                            <div className="syt-detail-body">
                                
                                {selectedArticle.importance && (
                                    <section className="syt-section">
                                        <button 
                                            className="syt-section-toggle"
                                            onClick={() => toggleSection('importance')}
                                        >
                                            <h2 className="syt-section-title">
                                                <i className="fa-solid fa-lightbulb"></i> Ý Nghĩa & Tầm Quan Trọng
                                            </h2>
                                            <i className={`fa-solid fa-chevron-${expandedSections['importance'] ? 'up' : 'down'}`}></i>
                                        </button>
                                        {expandedSections['importance'] && (
                                            <p className="syt-section-content">{selectedArticle.importance}</p>
                                        )}
                                    </section>
                                )}

                                {selectedArticle.description && (
                                    <section className="syt-section">
                                        <button 
                                            className="syt-section-toggle"
                                            onClick={() => toggleSection('description')}
                                        >
                                            <h2 className="syt-section-title">
                                                <i className="fa-solid fa-circle-info"></i> Mô Tả Chi Tiết
                                            </h2>
                                            <i className={`fa-solid fa-chevron-${expandedSections['description'] !== false ? 'up' : 'down'}`}></i>
                                        </button>
                                        {expandedSections['description'] !== false && (
                                            <p className="syt-section-content">{selectedArticle.description}</p>
                                        )}
                                    </section>
                                )}

                                {selectedArticle.indicator_type === 'calculated' && selectedArticle.formula && (
                                    <section className="syt-section">
                                        <button 
                                            className="syt-section-toggle"
                                            onClick={() => toggleSection('formula')}
                                        >
                                            <h2 className="syt-section-title">
                                                <i className="fa-solid fa-square-root-variable"></i> Công Thức Tính Toán
                                            </h2>
                                            <i className={`fa-solid fa-chevron-${expandedSections['formula'] !== false ? 'up' : 'down'}`}></i>
                                        </button>
                                        {expandedSections['formula'] !== false && (
                                            <div className="syt-formula-box">
                                                {selectedArticle.required_inputs && selectedArticle.required_inputs.length > 0 && (
                                                    <div className="syt-formula-inputs">
                                                        <strong className="syt-formula-label">Tham số đầu vào:</strong>
                                                        <div className="syt-input-tags">
                                                            {selectedArticle.required_inputs.map((inp, i) => (
                                                                <span key={i} className="syt-input-tag" title={`Mã: ${inp.code}`}>
                                                                    {inp.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <code className="syt-formula-code">{selectedArticle.formula}</code>
                                            </div>
                                        )}
                                    </section>
                                )}

                                {selectedArticle.normal_ranges && selectedArticle.normal_ranges.length > 0 && (
                                    <section className="syt-section">
                                        <button 
                                            className="syt-section-toggle"
                                            onClick={() => toggleSection('ranges')}
                                        >
                                            <h2 className="syt-section-title">
                                                <i className="fa-solid fa-chart-line"></i> Ngưỡng Chỉ Số Phân Loại
                                            </h2>
                                            <i className={`fa-solid fa-chevron-${expandedSections['ranges'] !== false ? 'up' : 'down'}`}></i>
                                        </button>
                                        {expandedSections['ranges'] !== false && (
                                            <div className="syt-ranges-grid">
                                                {selectedArticle.normal_ranges.map((range, idx) => (
                                                    <div key={idx} className="syt-range-card">
                                                        <div className="syt-range-label">{range.name}</div>
                                                        <div className="syt-range-value">
                                                            {range.min !== null ? range.min : '−∞'} – {range.max !== null ? range.max : '+∞'} {selectedArticle.unit}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                )}

                                {selectedArticle.recommendations && selectedArticle.recommendations.length > 0 && (
                                    <section className="syt-section">
                                        <button 
                                            className="syt-section-toggle"
                                            onClick={() => toggleSection('recommendations')}
                                        >
                                            <h2 className="syt-section-title">
                                                <i className="fa-solid fa-star-of-life"></i> Lời Khuyên & Khuyến Nghị
                                            </h2>
                                            <i className={`fa-solid fa-chevron-${expandedSections['recommendations'] !== false ? 'up' : 'down'}`}></i>
                                        </button>
                                        {expandedSections['recommendations'] !== false && (
                                            <div className="syt-recommendations">
                                                {selectedArticle.recommendations.map((rec, idx) => (
                                                    <div key={idx} className="syt-rec-item">
                                                        <span className="syt-rec-num">{idx + 1}</span>
                                                        <span className="syt-rec-text">{rec}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                )}

                                {selectedArticle.related_diseases && selectedArticle.related_diseases.length > 0 && (
                                    <section className="syt-section">
                                        <button 
                                            className="syt-section-toggle"
                                            onClick={() => toggleSection('diseases')}
                                        >
                                            <h2 className="syt-section-title">
                                                <i className="fa-solid fa-link"></i> Bệnh Lý Liên Quan
                                            </h2>
                                            <i className={`fa-solid fa-chevron-${expandedSections['diseases'] !== false ? 'up' : 'down'}`}></i>
                                        </button>
                                        {expandedSections['diseases'] !== false && (
                                            <div className="syt-disease-tags">
                                                {selectedArticle.related_diseases.map((disease, idx) => (
                                                    <span key={idx} className="syt-disease-tag" title={`Mã: ${disease.code}`}>
                                                        {disease.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                )}

                                {selectedArticle.images && selectedArticle.images.length > 0 && (
                                    <section className="syt-section">
                                        <button 
                                            className="syt-section-toggle"
                                            onClick={() => toggleSection('images')}
                                        >
                                            <h2 className="syt-section-title">
                                                <i className="fa-solid fa-images"></i> Hình Ảnh Minh Họa
                                            </h2>
                                            <i className={`fa-solid fa-chevron-${expandedSections['images'] !== false ? 'up' : 'down'}`}></i>
                                        </button>
                                        {expandedSections['images'] !== false && (
                                            <div className="syt-images-carousel">
                                                {selectedArticle.images.map((img, idx) => (
                                                    <img 
                                                        key={idx} 
                                                        src={img} 
                                                        alt={`Minh họa ${idx + 1}`}
                                                        className="syt-carousel-image"
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                )}

                                {selectedArticle.source && (
                                    <section className="syt-section">
                                        <button 
                                            className="syt-section-toggle"
                                            onClick={() => toggleSection('source')}
                                        >
                                            <h2 className="syt-section-title">
                                                <i className="fa-solid fa-book-open-reader"></i> Nguồn Tài Liệu & Trích Dẫn
                                            </h2>
                                            <i className={`fa-solid fa-chevron-${expandedSections['source'] !== false ? 'up' : 'down'}`}></i>
                                        </button>
                                        {expandedSections['source'] !== false && (
                                            <div className="syt-source-box">
                                                <strong>Nguồn tham khảo:</strong>
                                                {selectedArticle.source.startsWith('http') || selectedArticle.source.startsWith('https') ? (
                                                    <a 
                                                        href={selectedArticle.source} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="syt-source-link"
                                                    >
                                                        {selectedArticle.source} <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                                    </a>
                                                ) : (
                                                    <span className="syt-source-text">{selectedArticle.source}</span>
                                                )}
                                            </div>
                                        )}
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