import React from "react";
import { render, screen } from "@testing-library/react";
import { PausedBanner } from "./PausedBanner";

describe("PausedBanner", () => {
  it("renders the paused heading", () => {
    render(<PausedBanner />);
    expect(screen.getByText("Campaign Paused")).toBeInTheDocument();
  });

  it("shows default message when no reason provided", () => {
    render(<PausedBanner />);
    expect(screen.getByText(/temporarily paused by the creator/i)).toBeInTheDocument();
  });

  it("shows the provided reason instead of default message", () => {
    render(<PausedBanner reason="Reviewing compliance requirements" />);
    expect(screen.getByText("Reviewing compliance requirements")).toBeInTheDocument();
    expect(screen.queryByText(/temporarily paused by the creator/i)).not.toBeInTheDocument();
  });

  it("has role=status for accessibility", () => {
    render(<PausedBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has aria-label for screen readers", () => {
    render(<PausedBanner />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Campaign paused");
  });
});
