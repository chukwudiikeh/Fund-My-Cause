import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoalSuccessModal } from "./GoalSuccessModal";
import { GoalSuccessBadge } from "./GoalSuccessBadge";

// ── GoalSuccessBadge ──────────────────────────────────────────────────────────

describe("GoalSuccessBadge", () => {
  it("renders the goal reached message", () => {
    render(<GoalSuccessBadge totalRaisedXlm={5000} />);
    expect(screen.getByText(/Goal Reached/i)).toBeInTheDocument();
  });

  it("displays the formatted XLM amount", () => {
    render(<GoalSuccessBadge totalRaisedXlm={12345} />);
    expect(screen.getByText(/12,345 XLM/)).toBeInTheDocument();
  });

  it("has an accessible role=status", () => {
    render(<GoalSuccessBadge totalRaisedXlm={100} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

// ── GoalSuccessModal ──────────────────────────────────────────────────────────

const defaultProps = {
  campaignTitle: "Save the Rainforest",
  totalRaisedXlm: 8000,
  onClose: jest.fn(),
  onShare: jest.fn(),
  onWithdraw: jest.fn(),
};

describe("GoalSuccessModal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the campaign title", () => {
    render(<GoalSuccessModal {...defaultProps} />);
    expect(screen.getByText("Save the Rainforest")).toBeInTheDocument();
  });

  it("displays the total raised amount", () => {
    render(<GoalSuccessModal {...defaultProps} />);
    expect(screen.getByText("8,000 XLM")).toBeInTheDocument();
  });

  it("shows the withdraw button when not already withdrawn", () => {
    render(<GoalSuccessModal {...defaultProps} alreadyWithdrawn={false} />);
    expect(screen.getByRole("button", { name: /Withdraw Funds/i })).toBeInTheDocument();
  });

  it("hides the withdraw button when already withdrawn", () => {
    render(<GoalSuccessModal {...defaultProps} alreadyWithdrawn={true} />);
    expect(screen.queryByRole("button", { name: /Withdraw Funds/i })).not.toBeInTheDocument();
  });

  it("calls onShare when share button is clicked", () => {
    render(<GoalSuccessModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Share Your Success/i }));
    expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
  });

  it("calls onWithdraw when withdraw button is clicked", () => {
    render(<GoalSuccessModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Withdraw Funds/i }));
    expect(defaultProps.onWithdraw).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when dismiss button is clicked", () => {
    render(<GoalSuccessModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close (X) button is clicked", () => {
    render(<GoalSuccessModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const { container } = render(<GoalSuccessModal {...defaultProps} />);
    // The backdrop is the outermost fixed div
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("shows all three next-step items", () => {
    render(<GoalSuccessModal {...defaultProps} />);
    // "Share your success" appears in both the list item and the share button — use getAllByText
    expect(screen.getAllByText(/Share your success/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Withdraw funds to your wallet/i)).toBeInTheDocument();
    expect(screen.getByText(/Deliver on your campaign promises/i)).toBeInTheDocument();
  });
});
