const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/draftcontroller");
const { authenticateJWT } = require("../config/jwt");

// All draft routes require authentication — drafts are always private to the writer.

// ─── SPRINT FLOWS (specific routes first to avoid param conflicts) ─────────────

// Lightweight draft list for "pick a draft" modal in sprint room
router.get("/sprint-picker",        authenticateJWT, ctrl.getDraftsForSprintPicker);

// Auto-save when sprint ends with Inkwell editor content
router.post("/sprint-save",         authenticateJWT, ctrl.sprintAutoSave);

// ─── UNPUBLISH (submission → draft) ──────────────────────────────────────────

// Move a live critique submission to drafts
router.post("/unpublish/:submissionId", authenticateJWT, ctrl.unpublishSubmission);

// ─── DRAFT CRUD ───────────────────────────────────────────────────────────────

router.get("/",                     authenticateJWT, ctrl.getUserDrafts);
router.post("/",                    authenticateJWT, ctrl.createDraft);
router.get("/:draftId",             authenticateJWT, ctrl.getDraftById);
router.patch("/:draftId",           authenticateJWT, ctrl.updateDraft);
router.delete("/:draftId",          authenticateJWT, ctrl.deleteDraft);

// ─── DRAFT ACTIONS ────────────────────────────────────────────────────────────

// Republish a previously-unpublished submission back to the critique hub
router.post("/:draftId/republish",  authenticateJWT, ctrl.republishDraft);

// Post a fresh draft as a new critique hub submission
router.post("/:draftId/post-to-hub", authenticateJWT, ctrl.postDraftToHub);

module.exports = router;