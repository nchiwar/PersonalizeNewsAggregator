const loadPreferences = () => {
    const saved = localStorage.getItem('newsPrefs');
    return saved ? JSON.parse(saved) : { 
        category: 'all', 
        source: 'all', 
        fontSize: 'medium', 
        notifications: false, 
        theme: 'light' 
    };
};

const savePreferences = (prefs) => {
    localStorage.setItem('newsPrefs', JSON.stringify(prefs));
};

const loadProfile = () => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : { 
        username: '', 
        email: '', 
        password: '', 
        savedArticles: [] 
    };
};

const saveProfile = (profile) => {
    localStorage.setItem('userProfile', JSON.stringify(profile));
};

const setGuestMode = () => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('isGuest', 'true');
};

const toggleTheme = () => {
    const prefs = loadPreferences();
    prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark';
    savePreferences(prefs);
    document.documentElement.dataset.theme = prefs.theme;
};

const toggleMenu = () => {
    const nav = document.querySelector('.nav');
    nav.classList.toggle('active');
};

const toggleFilters = () => {
    const filters = document.getElementById('filters');
    filters.classList.toggle('hidden');
    filters.setAttribute('aria-hidden', filters.classList.contains('hidden'));
};

async function fetchArticles(category, source) {
    const apiKeys = {
        gnews: 'YOUR_GNEWS_KEY', // Replace with your GNews API key
        mediastack: 'YOUR_MEDIASTACK_KEY' // Replace with your Mediastack API key
    };
    const rssSources = {
        bbc: 'https://api.rss2json.com/v1/api.json?rss_url=http://feeds.bbci.co.uk/news/rss.xml',
        techcrunch: 'https://api.rss2json.com/v1/api.json?rss_url=https://techcrunch.com/feed/',
        guardian: 'https://content.guardianapis.com/search?api-key=test', // Use 'test' for free tier
        gnews: `https://gnews.io/api/v4/top-headlines?category=${category !== 'all' ? category : 'general'}&token=${apiKeys.gnews}`,
        mediastack: `http://api.mediastack.com/v1/news?access_key=${apiKeys.mediastack}&categories=${category !== 'all' ? category : 'general'}`
    };
    try {
        const response = await fetch(source === 'all' ? rssSources.bbc : rssSources[source]);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        let articles = [];
        if (source === 'gnews') {
            articles = data.articles.map(article => ({
                title: article.title,
                description: article.description,
                link: article.url,
                thumbnail: article.image
            }));
        } else if (source === 'mediastack') {
            articles = data.data.map(article => ({
                title: article.title,
                description: article.description,
                link: article.url,
                thumbnail: article.image
            }));
        } else if (source === 'guardian') {
            articles = data.response.results.map(article => ({
                title: article.webTitle,
                description: article.webTitle,
                link: article.webUrl,
                thumbnail: null
            }));
        } else {
            articles = data.items;
        }
        return articles.filter(item => 
            category === 'all' || 
            item.categories?.some(cat => cat.toLowerCase().includes(category)) || 
            item.title.toLowerCase().includes(category) ||
            item.description?.toLowerCase().includes(category)
        );
    } catch (error) {
        console.error('Fetch error:', error);
        const articlesContainer = document.getElementById('articles');
        if (articlesContainer) articlesContainer.innerHTML = '<p>Failed to load articles. Please try again later.</p>';
        return [];
    }
}

const summarize = (content) => {
    if (!content) return 'No description available.';
    const sentences = content.split('.').filter(s => s.trim());
    return sentences.slice(0, 2).join('.') + (sentences.length > 1 ? '.' : '');
};

function renderArticles(articles) {
    const container = document.getElementById('articles');
    if (!container) return;
    container.innerHTML = '';
    articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `
            <h3>${article.title}</h3>
            <img src="${article.thumbnail || 'https://source.unsplash.com/300x200/?news'}" alt="Article image">
            <p>${summarize(article.description)}</p>
            <a href="article.html?id=${encodeURIComponent(article.link)}" aria-label="Read full article: ${article.title}">Read More</a>
            <button class="btn btn-secondary save-button" onclick="saveArticle('${encodeURIComponent(JSON.stringify(article))}')">Save</button>
        `;
        container.appendChild(card);
    });
    setupLazyLoading();
}

function renderSavedArticles() {
    const container = document.getElementById('saved-articles');
    if (!container) return;
    const profile = loadProfile();
    container.innerHTML = '';
    profile.savedArticles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'saved-article-card';
        card.innerHTML = `
            <h3>${article.title}</h3>
            <img src="${article.thumbnail || 'https://source.unsplash.com/300x200/?news'}" alt="Article image">
            <p>${summarize(article.description)}</p>
            <a href="article.html?id=${encodeURIComponent(article.link)}" aria-label="Read full article: ${article.title}">Read More</a>
        `;
        container.appendChild(card);
    });
    setupLazyLoading();
}

function setupLazyLoading() {
    const cards = document.querySelectorAll('.article-card, .saved-article-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    cards.forEach(card => observer.observe(card));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function login() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const profile = loadProfile();
    if (email && password && profile.email === email && profile.password === password) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.removeItem('isGuest');
        window.location.href = 'index.html';
    } else {
        alert('Invalid credentials. Please register or try again.');
    }
}

function register() {
    const username = document.getElementById('username')?.value;
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    if (username && email && password) {
        const profile = loadProfile();
        profile.username = username;
        profile.email = email;
        profile.password = password;
        saveProfile(profile);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.removeItem('isGuest');
        window.location.href = 'index.html';
    } else {
        alert('Please fill all fields.');
    }
}

async function loadArticles() {
    const category = document.getElementById('category')?.value;
    const source = document.getElementById('source')?.value;
    if (category && source) {
        const prefs = loadPreferences();
        prefs.category = category;
        prefs.source = source;
        savePreferences(prefs);
        const articles = await fetchArticles(category, source);
        renderArticles(articles);
    }
}

function saveArticle(articleJson) {
    const article = JSON.parse(decodeURIComponent(articleJson));
    const profile = loadProfile();
    if (!profile.savedArticles.some(a => a.link === article.link)) {
        profile.savedArticles.push(article);
        saveProfile(profile);
        alert('Article saved!');
    } else {
        alert('Article already saved.');
    }
}

function loadSettings() {
    const prefs = loadPreferences();
    const fontSizeSelect = document.getElementById('font-size');
    const notificationsCheckbox = document.getElementById('notifications');
    if (fontSizeSelect) fontSizeSelect.value = prefs.fontSize;
    if (notificationsCheckbox) notificationsCheckbox.checked = prefs.notifications;
}

function saveSettings() {
    const fontSize = document.getElementById('font-size')?.value;
    const notifications = document.getElementById('notifications')?.checked;
    if (fontSize && notifications !== undefined) {
        const prefs = loadPreferences();
        prefs.fontSize = fontSize;
        prefs.notifications = notifications;
        savePreferences(prefs);
        document.documentElement.dataset.fontSize = fontSize;
        alert('Settings saved!');
    }
}

function loadProfileForm() {
    const profile = loadProfile();
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    if (usernameInput) usernameInput.value = profile.username;
    if (emailInput) emailInput.value = profile.email;
    renderSavedArticles();
}

function saveProfileForm() {
    const username = document.getElementById('username')?.value;
    const email = document.getElementById('email')?.value;
    if (username && email) {
        const profile = loadProfile();
        profile.username = username;
        profile.email = email;
        saveProfile(profile);
        alert('Profile updated!');
    }
}

function renderArticleDetail() {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('id');
    if (!articleId) return;
    const profile = loadProfile();
    const article = profile.savedArticles.find(a => a.link === decodeURIComponent(articleId)) || 
        { title: 'Article', description: 'Loading content...', link: decodeURIComponent(articleId), thumbnail: 'https://source.unsplash.com/300x200/?news' };
    const container = document.getElementById('article-detail');
    if (container) {
        container.innerHTML = `
            <p>Explore the full story from the original source for the latest updates and in-depth details.</p>
            <h2>${article.title}</h2>
            <img src="${article.thumbnail || 'https://source.unsplash.com/300x200/?news'}" alt="Article image">
            <p>${article.description || 'No description available.'}</p>
            <a href="${article.link}" target="_blank" class="btn btn-read-more" aria-label="Read full article at source">Read More</a>
            <button class="btn btn-secondary share-button" onclick="shareArticle('${encodeURIComponent(article.link)}', '${encodeURIComponent(article.title)}')">Share</button>
        `;
    }
}

function shareArticle(url, title) {
    if (navigator.share) {
        navigator.share({
            title: decodeURIComponent(title),
            url: decodeURIComponent(url)
        }).catch(error => console.error('Share error:', error));
    } else {
        navigator.clipboard.writeText(decodeURIComponent(url));
        alert('Share API not supported. URL copied to clipboard.');
    }
}

window.onload = () => {
    const prefs = loadPreferences();
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.fontSize = prefs.fontSize;
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn && !['welcome.html', 'login.html', 'register.html'].some(page => window.location.pathname.endsWith(page))) {
        window.location.href = 'welcome.html';
    }
    if (document.getElementById('category') && document.getElementById('source')) {
        document.getElementById('category').value = prefs.category;
        document.getElementById('source').value = prefs.source;
        loadArticles();
    }
    if (document.getElementById('font-size') || document.getElementById('notifications')) {
        loadSettings();
    }
    if (document.getElementById('username') || document.getElementById('email')) {
        loadProfileForm();
    }
    if (document.getElementById('article-detail')) {
        renderArticleDetail();
    }
};

document.addEventListener('change', debounce((event) => {
    if (event.target.matches('#category, #source')) loadArticles();
    if (event.target.matches('#font-size, #notifications')) saveSettings();
}, 300));