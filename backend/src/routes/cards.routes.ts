import { Router } from "express";
import { getCardDetail } from "../services/cardDetail.service";
import {
  CardUpstreamUnavailableError,
  fetchCards,
  getFriendlyCardFilters,
} from "../services/cards.service";

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const {
      page = "1",
      pageSize = "20",
      setIds = "",
      tags = "",
      tagMode = "all",
      search = "",
    } = request.query;
    const requestedSetIds = String(setIds)
      .split(",")
      .map((setId) => setId.trim())
      .filter(Boolean);
    const requestedTags = String(tags)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const safeTagMode = String(tagMode).toLowerCase() === "any" ? "any" : "all";

    const result = await fetchCards(
      Number(page),
      Number(pageSize),
      requestedSetIds,
      requestedTags,
      safeTagMode,
      String(search),
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/filters", async (request, response, next) => {
  try {
    const { setIds = "", analysisLimit = "1000" } = request.query;
    const requestedSetIds = String(setIds)
      .split(",")
      .map((setId) => setId.trim())
      .filter(Boolean);

    const filters = await getFriendlyCardFilters(
      requestedSetIds,
      Number(analysisLimit),
    );

    response.json(filters);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (request, response, next) => {
  try {
    const result = await getCardDetail(request.params.id);

    if (!result) {
      response.status(404).json({ message: "Card not found" });
      return;
    }

    response.json(result.frontend);
  } catch (error) {
    if (error instanceof CardUpstreamUnavailableError) {
      response.status(503).json({
        message: "Card data provider unavailable",
        cardId: error.cardId,
      });
      return;
    }

    next(error);
  }
});

export default router;
