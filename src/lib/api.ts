// API 관련 모듈 임포트
import { API_ENDPOINTS, POSTS_PER_PAGE, REVALIDATE_TIME } from "./constants";

// 빌드 시점에서 API 호출이 안전한지 확인하는 함수
function isSafeToCallAPI(): boolean {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // 빌드 시점에서 localhost API 호출 방지
  if (process.env.NODE_ENV === "production" && (!apiUrl || apiUrl.includes("localhost") || apiUrl === "disabled")) {
    console.warn("Skipping API call during build: API URL not configured or set to localhost");
    return false;
  }

  return true;
}

// 타입 정의
export interface FeaturedImage {
  url: string;
  width?: number;
  height?: number;
  alternativeText?: string;
  caption?: string;
}

export interface Tag {
  id: number;
  name?: string;
  slug?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface Post {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  content: string;
  description: string | null;
  featuredImage: FeaturedImage | null;
  publishedDate: string | null;
  postStatus: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  tags: Tag[];
  category:
    | string
    | {
        id?: number | string;
        name?: string;
        slug?: string;
        attributes?: {
          name?: string;
          slug?: string;
          [key: string]: unknown;
        };
        data?: {
          id?: number | string;
          attributes?: {
            name?: string;
            slug?: string;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        };
        [key: string]: unknown;
      }
    | null;
}

// Pagination interface
export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}

// Strapi API 응답 타입 정의
interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// 서버 컴포넌트에서 사용할 함수
export async function fetchPosts(): Promise<Post[]> {
  if (!isSafeToCallAPI()) {
    return [];
  }

  try {
    const response = await fetch(`${API_ENDPOINTS.POSTS}?populate=category`, {
      cache: "no-store",
      next: {
        tags: ["posts"]
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status}`);
    }

    const data = (await response.json()) as StrapiResponse<Post[]>;

    if (!data.data || !Array.isArray(data.data)) {
      console.error("Unexpected API response structure:", data);
      return [];
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}

// 페이지네이션 및 최신순 정렬이 있는 게시물 가져오기
export async function fetchPaginatedPosts(page = 1, pageSize = POSTS_PER_PAGE): Promise<PaginationResult<Post>> {
  // 빌드 시점에서 API 호출이 안전하지 않으면 빈 데이터 반환
  if (!isSafeToCallAPI()) {
    return { data: [], pagination: { page, pageSize, pageCount: 0, total: 0 } };
  }

  try {
    const url = `${API_ENDPOINTS.POSTS}?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort[0]=publishedDate:desc&sort[1]=publishedAt:desc&populate=category`;

    const response = await fetch(url, {
      next: {
        tags: ["posts"],
        revalidate: REVALIDATE_TIME
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status}`);
    }

    const data = (await response.json()) as StrapiResponse<Post[]>;

    if (!data.data || !Array.isArray(data.data)) {
      console.error("Unexpected API response structure:", data);
      return { data: [], pagination: { page, pageSize: POSTS_PER_PAGE, pageCount: 0, total: 0 } };
    }

    return {
      data: data.data,
      pagination: data.meta?.pagination || { page, pageSize: POSTS_PER_PAGE, pageCount: 0, total: 0 }
    };
  } catch (error) {
    console.error("Error fetching paginated posts:", error);
    return { data: [], pagination: { page, pageSize: POSTS_PER_PAGE, pageCount: 0, total: 0 } };
  }
}

// 클라이언트 컴포넌트에서 사용할 함수
export async function fetchPostsClient(): Promise<Post[]> {
  try {
    const response = await fetch(`${API_ENDPOINTS.POSTS}?populate=category`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status}`);
    }

    const data = (await response.json()) as StrapiResponse<Post[]>;

    if (!data.data || !Array.isArray(data.data)) {
      console.error("Unexpected API response structure:", data);
      return [];
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching posts in client:", error);
    return [];
  }
}

// 서버 컴포넌트에서 사용할 함수
export async function fetchPostById(id: string): Promise<Post | null> {
  try {
    const response = await fetch(`${API_ENDPOINTS.POSTS}/${id}`, {
      cache: "no-store",
      next: {
        tags: [`post-${id}`]
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch post: ${response.status}`);
    }

    const data = (await response.json()) as StrapiResponse<Post>;

    if (!data.data) {
      console.error("Unexpected API response structure:", data);
      return null;
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}

// 클라이언트 컴포넌트에서 사용할 함수
export async function fetchPostByIdClient(id: string): Promise<Post | null> {
  try {
    const response = await fetch(`${API_ENDPOINTS.POSTS}/${id}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch post: ${response.status}`);
    }

    const data = (await response.json()) as StrapiResponse<Post>;

    if (!data.data) {
      console.error("Unexpected API response structure:", data);
      return null;
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}

// 카테고리 데이터 가져오기
export async function fetchCategories(): Promise<Category[]> {
  try {
    const response = await fetch(API_ENDPOINTS.CATEGORIES, {
      cache: "no-store",
      next: {
        tags: ["categories"]
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      console.error("Unexpected API response structure:", data);
      return [];
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

// 카테고리별 게시물 가져오기
export async function fetchPostsByCategory(categorySlug: string, page = 1): Promise<PaginationResult<Post>> {
  if (!isSafeToCallAPI()) {
    return { data: [], pagination: { page, pageSize: POSTS_PER_PAGE, pageCount: 0, total: 0 } };
  }

  try {
    const url = `${API_ENDPOINTS.POSTS}?filters[category][slug][$eq]=${categorySlug}&pagination[page]=${page}&pagination[pageSize]=${POSTS_PER_PAGE}&sort[0]=publishedDate:desc&sort[1]=publishedAt:desc&populate=category`;

    const response = await fetch(url, {
      next: {
        tags: ["posts", `category${categorySlug}`],
        revalidate: REVALIDATE_TIME
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts for category ${categorySlug}: ${response.status}`);
    }

    const data = (await response.json()) as StrapiResponse<Post[]>;

    if (!data.data || !Array.isArray(data.data)) {
      console.error("Unexpected API response structure:", data);
      return { data: [], pagination: { page, pageSize: POSTS_PER_PAGE, pageCount: 0, total: 0 } };
    }

    return {
      data: data.data,
      pagination: data.meta?.pagination || { page, pageSize: POSTS_PER_PAGE, pageCount: 0, total: 0 }
    };
  } catch (error) {
    console.error("Error fetching posts by category:", error);
    return { data: [], pagination: { page, pageSize: POSTS_PER_PAGE, pageCount: 0, total: 0 } };
  }
}

// slug로 특정 카테고리 정보 가져오기
export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  if (!isSafeToCallAPI()) {
    return null;
  }

  try {
    const response = await fetch(`${API_ENDPOINTS.CATEGORIES}?filters[slug][$eq]=${slug}`, {
      next: {
        tags: [`category-${slug}`],
        revalidate: REVALIDATE_TIME
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch category: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return null;
    }

    return data.data[0];
  } catch (error) {
    console.error("Error fetching category:", error);
    return null;
  }
}
