import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './style/Leaderboard.css';

const Leaderboard = () => {
    const { user } = useAuth();
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [currentUserRank, setCurrentUserRank] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchLeaderboardData();
    }, [user]);

    const fetchLeaderboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('http://localhost:5001/api/leaderboard', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.error('Response status:', response.status);
                const errorData = await response.text();
                console.error('Response data:', errorData);
                throw new Error('Failed to fetch leaderboard data');
            }

            const data = await response.json();
            console.log('Leaderboard data:', data);
            setLeaderboardData(data.leaderboard || []);

            // Find current user's rank
            if (user && data.leaderboard) {
                const userRank = data.leaderboard.find(entry => entry.user_id === user.id);
                if (userRank) {
                    setCurrentUserRank(userRank);
                }
            }
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
            setError('Failed to load leaderboard data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="leaderboard-container"><div className="loading">Loading leaderboard...</div></div>;
    }

    if (error) {
        return <div className="leaderboard-container"><div className="error">{error}</div></div>;
    }

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header">
                <h1>Rider Leaderboard</h1>
                <p className="subtitle">Ranked by number of trips completed</p>
            </div>

            {currentUserRank && (
                <div className="current-user-card">
                    <div className="user-rank-badge">#{currentUserRank.rank}</div>
                    <div className="user-rank-info">
                        <p className="user-rank-label">Your Current Rank</p>
                        <p className="user-rank-name">{currentUserRank.username}</p>
                        <p className="user-rank-trips">{currentUserRank.trip_count} trips completed</p>
                    </div>
                </div>
            )}

            <div className="leaderboard-table-wrapper">
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th className="rank-col">Rank</th>
                            <th className="name-col">Rider</th>
                            <th className="trips-col">Trips</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboardData.map((entry) => (
                            <tr 
                                key={entry.user_id} 
                                className={`leaderboard-row ${user && entry.user_id === user.id ? 'current-user' : ''}`}
                            >
                                <td className="rank-col">
                                    <span className="rank-number">#{entry.rank}</span>
                                </td>
                                <td className="name-col">{entry.username}</td>
                                <td className="trips-col">{entry.trip_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {leaderboardData.length === 0 && (
                    <div className="no-data">
                        <p>No riders have completed any trips yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
