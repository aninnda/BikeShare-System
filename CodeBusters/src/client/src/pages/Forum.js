import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './style/Forum.css';

const Forum = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Fetch forum posts
    useEffect(() => {
        fetchPosts();
        // Refresh posts every 5 seconds
        const interval = setInterval(fetchPosts, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchPosts = async () => {
        try {
            setError('');
            const response = await fetch('http://localhost:5001/api/forum/posts');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                setPosts(data.posts || []);
            } else {
                setError(data.message || 'Failed to fetch forum posts');
            }
        } catch (err) {
            console.error('Error fetching posts:', err);
            setError('Unable to fetch forum posts. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePostSubmit = async (e) => {
        e.preventDefault();
        
        if (!newPostContent.trim()) {
            setError('Please write something before posting');
            return;
        }

        setPosting(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('http://localhost:5001/api/forum/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(user.id),
                    'x-user-role': String(user.role || 'rider'),
                    'x-username': String(user.username),
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({
                    content: newPostContent.trim()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setSuccess('Post created successfully!');
                setNewPostContent('');
                setError('');
                // Refresh posts
                fetchPosts();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.message || 'Failed to create post');
            }
        } catch (err) {
            console.error('Error posting:', err);
            setError('Error creating post. Please try again.');
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="forum-container">
            <div className="forum-header">
                <h1>Community Forum</h1>
                <p>Share your thoughts, tips, and experiences with other riders</p>
            </div>

            {/* Post Creation Section */}
            <div className="forum-post-form">
                <h2>What's on your mind?</h2>
                <form onSubmit={handlePostSubmit}>
                    <textarea
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="Share your thoughts, questions, or experiences..."
                        rows="5"
                        maxLength="5000"
                        disabled={posting}
                    />
                    <div className="form-footer">
                        <div className="character-count">
                            {newPostContent.length}/5000
                        </div>
                        <button 
                            type="submit" 
                            className="post-button"
                            disabled={posting || !newPostContent.trim()}
                        >
                            {posting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
            </div>

            {/* Posts Display Section */}
            <div className="forum-posts">
                <h2>Recent Posts</h2>
                {loading ? (
                    <div className="loading">Loading posts...</div>
                ) : posts.length === 0 ? (
                    <div className="no-posts">
                        <p>No posts yet. Be the first to share!</p>
                    </div>
                ) : (
                    <div className="posts-list">
                        {posts.map((post) => (
                            <div key={post.id} className="forum-post">
                                <div className="post-header">
                                    <span className="author-username">{post.username}</span>
                                </div>
                                <div className="post-content">
                                    {post.content}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Forum;
