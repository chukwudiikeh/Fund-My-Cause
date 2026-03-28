"use client";

import React, { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { PledgeModal } from "@/components/ui/PledgeModal";
import {
  fetchContribution,
  buildRefundTx,
  buildWithdrawTx,
  simulateTx,
  submitSignedTx,
  type CampaignStatus 
} from "@/lib/soroban";
import { useToast } from "@/components/ui/Toast";

interface Props {
  contractId: string;
  creator: string;
  deadlinePassed: boolean;
  goalMet: boolean;
  campaignTitle: string;
  status: CampaignStatus;
}

type ActionStatus = "idle" | "simulating" | "signing" | "submitting" | "done" | "error";

export function CampaignActions({
  contractId,
  creator,
  deadlinePassed,
  goalMet,
  campaignTitle,
  status,
}: Props) {
  const { address, connect, networkMismatch, signTx } = useWallet();
  const [pledging, setPledging] = useState(false);
  const [userContribution, setUserContribution] = useState(0);
  const [refundClaimed, setRefundClaimed] = useState(false);
  const { addToast } = useToast();
  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle");
  const [actionError, setActionError] = useState("");
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<
    "idle" | "pending" | "done" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      fetchContribution(contractId, address)
        .then(setUserContribution)
        .catch(() => setUserContribution(0));
    }
  }, [address, contractId]);

  const isCreator = !!address && address === creator;
  const canRefund =
    !!address &&
    deadlinePassed &&
    !goalMet &&
    userContribution > 0 &&
    !refundClaimed;
  const canWithdraw = isCreator && status === "Successful";

  async function handleRefund() {
    if (!address) {
      setErrorMessage("Please connect wallet first");
      return;
    }

    setTxStatus("pending");
    setErrorMessage(null);

    try {
      // Build the refund transaction
      const unsignedXdr = await buildRefundTx(address, contractId);

      // Sign with Freighter
      const signedXdr = await signTx(unsignedXdr);

      // Submit to network
      await submitSignedTx(signedXdr);

      setRefundClaimed(true);
      setTxStatus("done");
    } catch (err) {
      console.error("Refund failed:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Transaction failed. Please try again.",
      );
      setTxStatus("error");
    }
  }

  function handleRefund() {
    // buildWithdrawTx reused here; replace with buildRefundTx when available
    executeAction(
      () => buildWithdrawTx(address!, contractId),
      "Refund claimed successfully!",
    );
  }

  function handleWithdraw() {
    executeAction(
      () => buildWithdrawTx(address!, contractId),
      "Funds withdrawn successfully!",
    );
  }

  if (txStatus === "done" && refundClaimed) {
    return (
      <p className="text-green-500 dark:text-green-400 text-center py-4 font-medium">
        ✓ Refund of {userContribution.toLocaleString()} XLM claimed
      </p>
    );
  }

  if (txStatus === "done") {
    return (
      <p className="text-green-500 dark:text-green-400 text-center py-4">
        Transaction submitted successfully!
      </p>
    );
  }

  const isPending = actionStatus === "simulating" || actionStatus === "signing" || actionStatus === "submitting";

  const pendingLabel: Record<string, string> = {
    simulating: "Simulating…",
    signing: "Waiting for signature…",
    submitting: "Submitting…",
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Pledge — active campaigns only */}
        {status === "Active" && !deadlinePassed && (
          <button
            onClick={() => (address ? setPledging(true) : connect())}
            disabled={networkMismatch}
            className="w-full py-3 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 transition text-white disabled:opacity-50"
          >
            {address ? "Pledge Now" : "Connect Wallet to Pledge"}
          </button>
        )}

        {/* Claim Refund */}
        {canRefund && (
          <>
            {estimatedFee && actionStatus === "idle" && (
              <p className="text-xs text-gray-400 text-center">
                Estimated fee: <span className="text-white font-medium">{estimatedFee}</span>
              </p>
            )}
            <button
              onClick={handleRefund}
              disabled={isPending}
              className="w-full py-3 rounded-xl font-medium bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 transition text-white"
            >
              {isPending
                ? pendingLabel[actionStatus]
                : `Claim Refund (${userContribution.toLocaleString()} XLM)`}
            </button>
          </>
        )}

        {/* Withdraw Funds */}
        {canWithdraw && (
          <>
            {estimatedFee && actionStatus === "idle" && (
              <p className="text-xs text-gray-400 text-center">
                Estimated fee: <span className="text-white font-medium">{estimatedFee}</span>
              </p>
            )}
            <button
              onClick={handleWithdraw}
              disabled={isPending}
              className="w-full py-3 rounded-xl font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 transition text-white"
            >
              {isPending ? pendingLabel[actionStatus] : "Withdraw Funds"}
            </button>
          </>
        )}

        {txStatus === "error" && (
          <p className="text-red-500 dark:text-red-400 text-sm text-center">
            {errorMessage || "Transaction failed. Please try again."}
          </p>
        )}
      </div>

      {pledging && (
        <PledgeModal
          campaignTitle={campaignTitle}
          contractId={contractId}
          onClose={() => setPledging(false)}
        />
      )}
    </>
  );
}
