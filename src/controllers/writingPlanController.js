require("dotenv").config();
const writingPlanService = require("../services/writingPlanService");

async function createWritingplan(req, res) {
  const {
    mondayGoal, tuesdayGoal, wednesdayGoal, thursdayGoal,
    fridayGoal, saturdayGoal, sundayGoal,
    mondayTime, tuesdayTime, wednesdayTime, thursdayTime,
    fridayTime, saturdayTime, sundayTime
  } = req.body;

  const userId = req.user.id;
  const normalizeGoal = value =>
    value === null ? null : Number(value);

  try {
    const writingPlan = await writingPlanService.createWritingPlan(
      Number(userId),
      normalizeGoal(mondayGoal),
      normalizeGoal(tuesdayGoal),
      normalizeGoal(wednesdayGoal),
      normalizeGoal(thursdayGoal),
      normalizeGoal(fridayGoal),
      normalizeGoal(saturdayGoal),
      normalizeGoal(sundayGoal),
      mondayTime,
      tuesdayTime,
      wednesdayTime,
      thursdayTime,
      fridayTime,
      saturdayTime,
      sundayTime
    );

    res.status(201).json({ writingPlan });
  } catch (error) {
    console.error("Writing plan error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function updateWritingPlan(req, res) {
  const {
    mondayGoal, tuesdayGoal, wednesdayGoal, thursdayGoal,
    fridayGoal, saturdayGoal, sundayGoal,
    mondayTime, tuesdayTime, wednesdayTime, thursdayTime,
    fridayTime, saturdayTime, sundayTime
  } = req.body;

  const planId = req.params.planId;
  const normalizeGoal = value =>
    value === null ? null : Number(value);

  try {
    const writingPlan = await writingPlanService.updateWritingPlan(
      Number(planId),
      normalizeGoal(mondayGoal),
      normalizeGoal(tuesdayGoal),
      normalizeGoal(wednesdayGoal),
      normalizeGoal(thursdayGoal),
      normalizeGoal(fridayGoal),
      normalizeGoal(saturdayGoal),
      normalizeGoal(sundayGoal),
      mondayTime,
      tuesdayTime,
      wednesdayTime,
      thursdayTime,
      fridayTime,
      saturdayTime,
      sundayTime
    );

    res.status(200).json({ writingPlan });
  } catch (error) {
    console.error("Updating writing plan error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function fetchWritingplan(req, res) {
  const userId = req.user.id;

  try {
    const writingPlan = await writingPlanService.fetchWritingPlan(Number(userId));
    res.status(200).json({ writingPlan });
  } catch (error) {
    console.error("Fetching writing plan error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

module.exports = {
  createWritingplan,
  updateWritingPlan,
  fetchWritingplan
};