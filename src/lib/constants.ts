// API 관련 상수 정의
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1337/api";

// 엔드포인트 정의
export const API_ENDPOINTS = {
  POSTS: `${API_BASE_URL}/posts`,
  CATEGORIES: `${API_BASE_URL}/categories`,
  CATEGORY: `${API_BASE_URL}/category`,
  AUTH: `${API_BASE_URL}/auth`,
  TAGS: `${API_BASE_URL}/tags`,
  USERS: `${API_BASE_URL}/users`
};

// 기타 상수
export const POSTS_PER_PAGE = 10;

// 재검증 시간 설정 (초 단위)
// 개발 환경에서는 10초, 프로덕션에서는 5분(300초)
export const REVALIDATE_TIME = process.env.NODE_ENV === "development" ? 10 : 300;

export const MAIN = {
  title: "Bradley",
  description: "Bradley's Blog is a blog about my life and my thoughts.",
  keywords: "bradley's blog, bradley, blog",
  author: "Bradley",
  url: "https://bradley.blog",
  image: "https://mykim.blog/images/logo.png",
  twitter: "@mykim",
  facebook: "https://www.facebook.com/mykim"
};
