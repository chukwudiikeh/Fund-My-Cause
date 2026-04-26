import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CancelCampaignModal } from "./CancelCampaignModal";

const defaultProps = {
  campaignTitle: "Save the Oceans",
  onClose: jest.fn(),
  onConfirm: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("CancelCampaignModal", () => {
  it("renders the campaign title", () => {
    render(<CancelCampaignModal {...defaultProps} />);
    expect(screen.getByText("Save the Oceans")).toBeInTheDocument();
  });

  it("shows the irreversible warning", () => {
    render(<CancelCampaignModal {...defaultProps} />);
    expect(screen.getByText(/irreversible/i)).toBeInTheDocument();
  });

  it("calls onClose when Keep Campaign is clicked", () => {
    render(<CancelCampaignModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Keep Campaign/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when X button is clicked", () => {
    render(<CancelCampaignModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("shows validation error when confirming with only whitespace", async () => {
    defaultProps.onConfirm.mockResolvedValueOnce(undefined);
    render(<CancelCampaignModal {...defaultProps} />);

    // Type whitespace — button becomes enabled but reason.trim() is empty
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Cancel/i }));

    expect(await screen.findByText(/provide a cancellation reason/i)).toBeInTheDocument();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm with the reason and closes on success", async () => {
    defaultProps.onConfirm.mockResolvedValueOnce(undefined);
    render(<CancelCampaignModal {...defaultProps} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Project cancelled" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Cancel/i }));

    await waitFor(() => expect(defaultProps.onConfirm).toHaveBeenCalledWith("Project cancelled"));
    await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalledTimes(1));
  });

  it("shows error message when onConfirm rejects", async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error("Transaction failed"));
    render(
      <CancelCampaignModal
        campaignTitle="Save the Oceans"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Some reason" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Cancel/i }));

    await waitFor(() =>
      expect(screen.getByText("Transaction failed")).toBeInTheDocument()
    );
  });

  it("Confirm Cancel button is not disabled when reason is empty (validation is JS-side)", () => {
    render(<CancelCampaignModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Confirm Cancel/i })).not.toBeDisabled();
  });

  it("Confirm Cancel button has aria-disabled when reason is empty", () => {
    render(<CancelCampaignModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Confirm Cancel/i })).toHaveAttribute("aria-disabled", "true");
  });

  it("Confirm Cancel button does not have aria-disabled when reason is filled", () => {
    render(<CancelCampaignModal {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "reason" } });
    expect(screen.getByRole("button", { name: /Confirm Cancel/i })).toHaveAttribute("aria-disabled", "false");
  });
});
