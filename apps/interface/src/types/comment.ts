export interface Comment {
  id: string;
  campaignId: string;
  author: string;
  content: string;
  timestamp: number;
  upvotes: number;
  downvotes: number;
  parentId?: string; // For threading
  isDeleted: boolean;
  isFlagged: boolean;
}

export interface CommentInput {
  content: string;
  parentId?: string;
}

export interface CommentVote {
  commentId: string;
  voter: string;
  type: "up" | "down";
}
