export interface YouTubeVideo {
  id: string;
  title: string;
  publishedAt: string;
  description: string;
  thumbnail: string;
  duration?: number;
  viewCount?: number;
  likeCount?: number;
}

export interface YouTubeFeed {
  channelId: string;
  channelHandle: string;
  updatedAt: string;
  count: number;
  videos: YouTubeVideo[];
}
