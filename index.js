const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// اتصال به MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/followSystem', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true }
});

const followSchema = new mongoose.Schema({
    follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    followee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Follow = mongoose.model('Follow', followSchema);

app.get('/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/users', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const user = new User({ username });
        await user.save();
        res.status(201).json({ message: 'User added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/follow', async (req, res) => {
    const { followerUsername, followeeUsername } = req.body;
    if (!followerUsername || !followeeUsername) {
        return res.status(400).json({ error: 'Follower and followee usernames are required' });
    }

    try {
        const follower = await User.findOne({ username: followerUsername });
        const followee = await User.findOne({ username: followeeUsername });

        if (!follower || !followee) {
            return res.status(404).json({ error: 'User not found' });
        }

        const follow = new Follow({ follower: follower._id, followee: followee._id });
        await follow.save();

        res.status(201).json({ message: 'Followed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/unfollow', async (req, res) => {
    const { followerUsername, followeeUsername } = req.body;
    if (!followerUsername || !followeeUsername) {
        return res.status(400).json({ error: 'Follower and followee usernames are required' });
    }

    try {
        const follower = await User.findOne({ username: followerUsername });
        const followee = await User.findOne({ username: followeeUsername });

        if (!follower || !followee) {
            return res.status(404).json({ error: 'User not found' });
        }

        await Follow.findOneAndDelete({ follower: follower._id, followee: followee._id });

        res.status(200).json({ message: 'Unfollowed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/followers/:username', async (req, res) => {
    const username = req.params.username;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const followers = await Follow.find({ followee: user._id }).populate('follower', 'username');
        res.status(200).json(followers.map(f => f.follower.username));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/following/:username', async (req, res) => {
    const username = req.params.username;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const following = await Follow.find({ follower: user._id }).populate('followee', 'username');
        res.status(200).json(following.map(f => f.followee.username));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/daily_followers/:username', async (req, res) => {
    const username = req.params.username;
    const today = new Date().setHours(0, 0, 0, 0);

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const followersCount = await Follow.countDocuments({
            followee: user._id,
            date: { $gte: new Date(today) }
        });

        res.status(200).json({ daily_followers: followersCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/common_followers', async (req, res) => {
    const { username1, username2 } = req.body;
    if (!username1 || !username2) {
        return res.status(400).json({ error: 'Both usernames are required' });
    }

    try {
        const user1 = await User.findOne({ username: username1 });
        const user2 = await User.findOne({ username: username2 });

        if (!user1 || !user2) {
            return res.status(404).json({ error: 'User not found' });
        }

        const followers1 = await Follow.find({ followee: user1._id }).populate('follower', 'username');
        const followers2 = await Follow.find({ followee: user2._id }).populate('follower', 'username');

        const commonFollowers = followers1
            .map(f => f.follower.username)
            .filter(username => followers2.map(f => f.follower.username).includes(username));

        res.status(200).json(commonFollowers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
