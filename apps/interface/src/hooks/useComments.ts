import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Comment, CommentInput } from "@/types/comment";

// Mock storage - in production, this would use IPFS or on-chain storage
const COMMENTS_STORAGE_KEY = "campaign_comments";

function getStoredComments(): Comment[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveComments(comments: Comment[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
}

export function useComments(campaignId: string, userAddress: string | null) {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["comments", campaignId],
    queryFn: () => {
      const allComments = getStoredComments();
      return allComments.filter(c => c.campaignId === campaignId);
    },
    staleTime: 10_000,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: CommentInput) => {
      if (!userAddress) throw new Error("Wallet not connected");
      
      const allComments = getStoredComments();
      const newComment: Comment = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        campaignId,
        author: userAddress,
        content,
        timestamp: Date.now(),
        upvotes: 0,
        downvotes: 0,
        parentId,
        isDeleted: false,
        isFlagged: false,
      };
      
      allComments.push(newComment);
      saveComments(allComments);
      return newComment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", campaignId] });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ commentId, type }: { commentId: string; type: "up" | "down" }) => {
      const allComments = getStoredComments();
      const comment = allComments.find(c => c.id === commentId);
      if (!comment) throw new Error("Comment not found");

      if (type === "up") {
        comment.upvotes += 1;
      } else {
        comment.downvotes += 1;
      }

      saveComments(allComments);
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", campaignId] });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const allComments = getStoredComments();
      const comment = allComments.find(c => c.id === commentId);
      if (!comment) throw new Error("Comment not found");

      comment.isFlagged = true;
      saveComments(allComments);
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", campaignId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const allComments = getStoredComments();
      const comment = allComments.find(c => c.id === commentId);
      if (!comment) throw new Error("Comment not found");

      comment.isDeleted = true;
      comment.content = "[deleted]";
      saveComments(allComments);
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", campaignId] });
    },
  });

  const addComment = useCallback(
    async (content: string, parentId?: string) => {
      await addCommentMutation.mutateAsync({ content, parentId });
    },
    [addCommentMutation]
  );

  const vote = useCallback(
    async (commentId: string, type: "up" | "down") => {
      await voteMutation.mutateAsync({ commentId, type });
    },
    [voteMutation]
  );

  const flag = useCallback(
    async (commentId: string) => {
      await flagMutation.mutateAsync(commentId);
    },
    [flagMutation]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      await deleteMutation.mutateAsync(commentId);
    },
    [deleteMutation]
  );

  return {
    comments,
    isLoading,
    addComment,
    vote,
    flag,
    deleteComment,
  };
}
