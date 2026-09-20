const GAME_MODES = ["Solo", "Duo", "Squad", "Clash Squad", "Lone Wolf"];

const TOURNAMENT_STATUS = {
  DRAFT: "draft",
  UPCOMING: "upcoming",
  REGISTRATION_OPEN: "registration_open",
  REGISTRATION_CLOSED: "registration_closed",
  LIVE: "live",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const TOURNAMENT_TRANSITIONS = {
  draft: ["upcoming", "registration_open", "cancelled"],
  upcoming: ["registration_open", "cancelled"],
  registration_open: ["registration_closed", "live", "cancelled"],
  registration_closed: ["live", "cancelled"],
  live: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  ROOM_READY: "room_ready",
  LIVE: "live",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const MATCH_TRANSITIONS = {
  scheduled: ["room_ready", "cancelled"],
  room_ready: ["live", "cancelled"],
  live: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const DEFAULT_SCORING = {
  killPoints: 1,
  bonusPoints: 0,
  placementPoints: {
    1: 12,
    2: 9,
    3: 8,
    4: 7,
    5: 6,
    6: 5,
    7: 4,
    8: 3,
    9: 2,
    10: 1,
  },
};

function canTransition(map, from, to) {
  return Array.isArray(map[from]) && map[from].includes(to);
}

module.exports = {
  GAME_MODES,
  TOURNAMENT_STATUS,
  TOURNAMENT_TRANSITIONS,
  MATCH_STATUS,
  MATCH_TRANSITIONS,
  DEFAULT_SCORING,
  canTransition,
};
