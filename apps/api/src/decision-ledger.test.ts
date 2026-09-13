import {
  describe,
  expect,
  it,
} from "vitest";

import {
  STAFF_ACTIONS,
  OUTCOMES,
  eventForOutcome,
  eventForStaffAction,
  isCompatibleActionOutcome,
  isDecisionOutcome,
  isStaffAction,
  isTerminalOutcome,
  outcomeForStaffAction,
  validateStaffActionOutcome,
} from "./decision-ledger.js";


describe("SALORA Decision Outcome Ledger", () => {
  describe("staff action definitions", () => {
    it("contains all supported staff actions", () => {
      expect(STAFF_ACTIONS).toEqual([
        "ACCEPT",
        "REJECT",
        "RESCHEDULE",
        "WAIT",
        "EXPIRE",
        "CANCEL",
      ]);
    });
  });


  describe("outcome definitions", () => {
    it("contains accepted and rejected outcomes separately", () => {
      expect(OUTCOMES).toContain(
        "ACCEPTED",
      );

      expect(OUTCOMES).toContain(
        "REJECTED",
      );
    });


    it("contains ABANDONED as a separate outcome", () => {
      expect(OUTCOMES).toContain(
        "ABANDONED",
      );

      expect(
        "ABANDONED",
      ).not.toBe(
        "REJECTED",
      );
    });
  });


  describe("staff action to outcome mapping", () => {
    it("maps ACCEPT to ACCEPTED", () => {
      expect(
        outcomeForStaffAction(
          "ACCEPT",
        ),
      ).toBe(
        "ACCEPTED",
      );
    });


    it("maps REJECT to REJECTED", () => {
      expect(
        outcomeForStaffAction(
          "REJECT",
        ),
      ).toBe(
        "REJECTED",
      );
    });


    it("maps RESCHEDULE to RESCHEDULED", () => {
      expect(
        outcomeForStaffAction(
          "RESCHEDULE",
        ),
      ).toBe(
        "RESCHEDULED",
      );
    });


    it("maps WAIT to WAITED", () => {
      expect(
        outcomeForStaffAction(
          "WAIT",
        ),
      ).toBe(
        "WAITED",
      );
    });


    it("maps EXPIRE to EXPIRED", () => {
      expect(
        outcomeForStaffAction(
          "EXPIRE",
        ),
      ).toBe(
        "EXPIRED",
      );
    });


    it("maps CANCEL to CANCELLED", () => {
      expect(
        outcomeForStaffAction(
          "CANCEL",
        ),
      ).toBe(
        "CANCELLED",
      );
    });
  });


  describe("staff action to event mapping", () => {
    it("maps ACCEPT to ACCEPTED event", () => {
      expect(
        eventForStaffAction(
          "ACCEPT",
        ),
      ).toBe(
        "ACCEPTED",
      );
    });


    it("maps REJECT to REJECTED event", () => {
      expect(
        eventForStaffAction(
          "REJECT",
        ),
      ).toBe(
        "REJECTED",
      );
    });


    it("maps RESCHEDULE to RESCHEDULED event", () => {
      expect(
        eventForStaffAction(
          "RESCHEDULE",
        ),
      ).toBe(
        "RESCHEDULED",
      );
    });


    it("maps WAIT to WAITED event", () => {
      expect(
        eventForStaffAction(
          "WAIT",
        ),
      ).toBe(
        "WAITED",
      );
    });
  });


  describe("outcome to event mapping", () => {
    it("maps ACCEPTED to ACCEPTED", () => {
      expect(
        eventForOutcome(
          "ACCEPTED",
        ),
      ).toBe(
        "ACCEPTED",
      );
    });


    it("maps REJECTED to REJECTED", () => {
      expect(
        eventForOutcome(
          "REJECTED",
        ),
      ).toBe(
        "REJECTED",
      );
    });


    it("maps RESCHEDULED to RESCHEDULED", () => {
      expect(
        eventForOutcome(
          "RESCHEDULED",
        ),
      ).toBe(
        "RESCHEDULED",
      );
    });


    it("maps WAITED to WAITED", () => {
      expect(
        eventForOutcome(
          "WAITED",
        ),
      ).toBe(
        "WAITED",
      );
    });


    it("maps EXPIRED to EXPIRED", () => {
      expect(
        eventForOutcome(
          "EXPIRED",
        ),
      ).toBe(
        "EXPIRED",
      );
    });


    it("maps ABANDONED to ABANDONED", () => {
      expect(
        eventForOutcome(
          "ABANDONED",
        ),
      ).toBe(
        "ABANDONED",
      );
    });


    it("maps CANCELLED to CANCELLED", () => {
      expect(
        eventForOutcome(
          "CANCELLED",
        ),
      ).toBe(
        "CANCELLED",
      );
    });


    it("maps COMPLETED to COMPLETED", () => {
      expect(
        eventForOutcome(
          "COMPLETED",
        ),
      ).toBe(
        "COMPLETED",
      );
    });


    it("maps NO_SHOW to NO_SHOW", () => {
      expect(
        eventForOutcome(
          "NO_SHOW",
        ),
      ).toBe(
        "NO_SHOW",
      );
    });
  });


  describe("recommendation and action separation", () => {
    it("allows ACCEPT recommendation with ACCEPT action", () => {
      expect(
        isCompatibleActionOutcome(
          "ACCEPT",
          "ACCEPTED",
        ),
      ).toBe(true);
    });


    it("allows ACCEPT_WITH_WARNING recommendation with ACCEPT action", () => {
      expect(
        isCompatibleActionOutcome(
          "ACCEPT",
          "ACCEPTED",
        ),
      ).toBe(true);
    });


    it("does not treat recommendation state as staff action", () => {
      const recommendationState =
        "ACCEPT_WITH_WARNING";

      const staffAction =
        "ACCEPT";

      expect(
        recommendationState,
      ).not.toBe(
        staffAction,
      );
    });


    it("allows staff to reject a recommendation", () => {
      expect(
        isCompatibleActionOutcome(
          "REJECT",
          "REJECTED",
        ),
      ).toBe(true);
    });


    it("allows staff to reschedule a recommendation", () => {
      expect(
        isCompatibleActionOutcome(
          "RESCHEDULE",
          "RESCHEDULED",
        ),
      ).toBe(true);
    });


    it("allows staff to wait", () => {
      expect(
        isCompatibleActionOutcome(
          "WAIT",
          "WAITED",
        ),
      ).toBe(true);
    });
  });


  describe("invalid action/outcome combinations", () => {
    it("rejects ACCEPT with REJECTED", () => {
      expect(
        isCompatibleActionOutcome(
          "ACCEPT",
          "REJECTED",
        ),
      ).toBe(false);
    });


    it("rejects REJECT with ACCEPTED", () => {
      expect(
        isCompatibleActionOutcome(
          "REJECT",
          "ACCEPTED",
        ),
      ).toBe(false);
    });


    it("rejects WAIT with ACCEPTED", () => {
      expect(
        isCompatibleActionOutcome(
          "WAIT",
          "ACCEPTED",
        ),
      ).toBe(false);
    });


    it("rejects RESCHEDULE with ACCEPTED", () => {
      expect(
        isCompatibleActionOutcome(
          "RESCHEDULE",
          "ACCEPTED",
        ),
      ).toBe(false);
    });


    it("throws for incompatible action/outcome", () => {
      expect(() =>
        validateStaffActionOutcome(
          "ACCEPT",
          "REJECTED",
        ),
      ).toThrow(
        "Staff action ACCEPT is not compatible with outcome REJECTED",
      );
    });
  });


  describe("ABANDONED semantics", () => {
    it("does not consider ABANDONED a rejection", () => {
      expect(
        isCompatibleActionOutcome(
          "REJECT",
          "ABANDONED",
        ),
      ).toBe(false);
    });


    it("recognizes ABANDONED as a terminal outcome", () => {
      expect(
        isTerminalOutcome(
          "ABANDONED",
        ),
      ).toBe(true);
    });


    it("recognizes REJECTED as a terminal outcome", () => {
      expect(
        isTerminalOutcome(
          "REJECTED",
        ),
      ).toBe(true);
    });


    it("keeps ABANDONED and REJECTED semantically distinct", () => {
      expect(
        isTerminalOutcome(
          "ABANDONED",
        ),
      ).toBe(
        isTerminalOutcome(
          "REJECTED",
        ),
      );

      expect(
        eventForOutcome(
          "ABANDONED",
        ),
      ).toBe(
        "ABANDONED",
      );

      expect(
        eventForOutcome(
          "REJECTED",
        ),
      ).toBe(
        "REJECTED",
      );
    });
  });


  describe("type guards", () => {
    it("recognizes valid staff actions", () => {
      expect(
        isStaffAction(
          "ACCEPT",
        ),
      ).toBe(true);

      expect(
        isStaffAction(
          "WAIT",
        ),
      ).toBe(true);

      expect(
        isStaffAction(
          "RESCHEDULE",
        ),
      ).toBe(true);
    });


    it("rejects invalid staff actions", () => {
      expect(
        isStaffAction(
          "INVALID",
        ),
      ).toBe(false);

      expect(
        isStaffAction(
          null,
        ),
      ).toBe(false);

      expect(
        isStaffAction(
          123,
        ),
      ).toBe(false);
    });


    it("recognizes valid outcomes", () => {
      expect(
        isDecisionOutcome(
          "ACCEPTED",
        ),
      ).toBe(true);

      expect(
        isDecisionOutcome(
          "ABANDONED",
        ),
      ).toBe(true);

      expect(
        isDecisionOutcome(
          "COMPLETED",
        ),
      ).toBe(true);
    });


    it("rejects invalid outcomes", () => {
      expect(
        isDecisionOutcome(
          "INVALID",
        ),
      ).toBe(false);

      expect(
        isDecisionOutcome(
          null,
        ),
      ).toBe(false);

      expect(
        isDecisionOutcome(
          123,
        ),
      ).toBe(false);
    });
  });


  describe("terminal outcomes", () => {
    it("recognizes accepted as terminal", () => {
      expect(
        isTerminalOutcome(
          "ACCEPTED",
        ),
      ).toBe(true);
    });


    it("recognizes rejected as terminal", () => {
      expect(
        isTerminalOutcome(
          "REJECTED",
        ),
      ).toBe(true);
    });


    it("recognizes rescheduled as terminal", () => {
      expect(
        isTerminalOutcome(
          "RESCHEDULED",
        ),
      ).toBe(true);
    });


    it("recognizes expired as terminal", () => {
      expect(
        isTerminalOutcome(
          "EXPIRED",
        ),
      ).toBe(true);
    });


    it("recognizes cancelled as terminal", () => {
      expect(
        isTerminalOutcome(
          "CANCELLED",
        ),
      ).toBe(true);
    });


    it("recognizes completed as terminal", () => {
      expect(
        isTerminalOutcome(
          "COMPLETED",
        ),
      ).toBe(true);
    });


    it("recognizes no-show as terminal", () => {
      expect(
        isTerminalOutcome(
          "NO_SHOW",
        ),
      ).toBe(true);
    });


    it("recognizes abandoned as terminal", () => {
      expect(
        isTerminalOutcome(
          "ABANDONED",
        ),
      ).toBe(true);
    });


    it("does not treat null as terminal", () => {
      expect(
        isTerminalOutcome(
          null,
        ),
      ).toBe(false);
    });


    it("does not treat undefined as terminal", () => {
      expect(
        isTerminalOutcome(
          undefined,
        ),
      ).toBe(false);
    });
  });
});