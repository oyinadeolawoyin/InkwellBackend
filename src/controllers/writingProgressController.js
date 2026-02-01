const writingProgressService = require("../services/writingProgressService");

async function getDailyProgress(req, res) {
    const userId = req.user.id;
    
    try {
        const progress = await writingProgressService.getDailyProgress(userId);
        res.status(200).json(progress);
    } catch (error) {
        console.error("Daily progress error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }
}

async function getWeeklyProgress(req, res) {
    const userId = req.user.id;
    
    try {
        const progress = await writingProgressService.getWeeklyProgress(userId);
        res.status(200).json(progress);
    } catch (error) {
        console.error("Weekly progress error:", error);
        res.status(500).json({ message: "Something went wrong. PLease try again." });
    }
}

async function writingWeeklyProgress(req, res) {
    const userId = req.user.id;
    console.log("userId", userId);
    try {
        const writingWeeklyProgress = await writingProgressService.writingWeeklyProgress(Number(userId));
        console.log("weeklyP", writingWeeklyProgress);
        res.status(200).json({ writingWeeklyProgress });
    } catch(error){
        console.error("Weekly writing progress error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }
}

module.exports = {
    getDailyProgress,
    getWeeklyProgress,
    writingWeeklyProgress
};