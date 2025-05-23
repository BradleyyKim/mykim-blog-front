"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, X, AlertCircle } from "lucide-react";
import { useCreatePost } from "@/lib/tanstack-query";
import { ProtectedRoute } from "@/lib/auth";
import RichTextEditor from "@/components/RichTextEditor";
import { Category, fetchCategories } from "@/lib/api";
import { useForm, Controller, Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Zod schema for form validation
const postSchema = z.object({
  title: z.string().min(1, "제목은 필수 항목입니다."),
  content: z.string().min(1, "내용은 필수 항목입니다."),
  category: z.string().min(1, "카테고리는 필수 항목입니다."),
  description: z.string().optional()
});

type PostFormData = z.infer<typeof postSchema>;

// 유틸리티 함수들
const extractFirstImageFromHtml = (html: string) => {
  const imgRegex = /<img[^>]+src="([^">]+)"/;
  const imgMatch = html.match(imgRegex);
  return imgMatch?.[1] || null;
};

const stripHtml = (html: string) => {
  return html.replace(/<\/?[^>]+(>|$)/g, "");
};

const createDescription = (content: string, existingDescription?: string) => {
  const plainText = stripHtml(content);
  return existingDescription || plainText.substring(0, 160);
};

// 공통 에러 메시지 컴포넌트
interface FormErrorMessageProps {
  error?: string;
  showError: boolean;
}

function FormErrorMessage({ error, showError }: FormErrorMessageProps) {
  if (!showError || !error) return null;
  return <p className="text-xs text-red-500 mt-1">{error}</p>;
}

// 알림 컴포넌트
interface NotificationAreaProps {
  error: string | null;
  isLoadingCategories: boolean;
  hasCategoriesError: boolean;
}

function NotificationArea({ error, isLoadingCategories, hasCategoriesError }: NotificationAreaProps) {
  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>;
  }

  if (!isLoadingCategories && hasCategoriesError) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-6 flex items-start">
        <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">카테고리를 가져올 수 없습니다</p>
          <p className="text-sm mt-1">카테고리가 없어 새 글을 작성할 수 없습니다. 나중에 다시 시도하거나 관리자에게 문의하세요.</p>
        </div>
      </div>
    );
  }

  return null;
}

// 카테고리 선택 컴포넌트
interface CategorySelectProps {
  control: Control<PostFormData>;
  categories: Category[];
  isLoadingCategories: boolean;
  errors: FieldErrors<PostFormData>;
  disabled: boolean;
}

function CategorySelect({ control, categories, isLoadingCategories, errors, disabled }: CategorySelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="category" className="flex items-center">
        카테고리
        <span className="text-red-500 ml-1">*</span>
      </Label>
      {isLoadingCategories ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-gray-500">카테고리 로딩 중...</span>
        </div>
      ) : categories.length > 0 ? (
        <Controller
          name="category"
          control={control}
          render={({ field }: { field: { value: string; onChange: (value: string) => void } }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
              <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                <SelectValue placeholder="카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category =>
                  category.slug ? (
                    <SelectItem key={`${category.id}-${category.slug}`} value={category.slug}>
                      <span>{category.name}</span>
                    </SelectItem>
                  ) : null
                )}
              </SelectContent>
            </Select>
          )}
        />
      ) : (
        <div className="border rounded-md py-2 px-3 text-gray-500 bg-gray-50 dark:bg-gray-800">카테고리를 가져올 수 없습니다</div>
      )}
      <FormErrorMessage error={errors.category?.message} showError={!!errors.category} />
    </div>
  );
}

// 제목 입력 컴포넌트
interface TitleInputProps {
  register: UseFormRegister<PostFormData>;
  errors: FieldErrors<PostFormData>;
  disabled: boolean;
}

function TitleInput({ register, errors, disabled }: TitleInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="title" className="flex items-center">
        제목
        <span className="text-red-500 ml-1">*</span>
      </Label>
      <Input id="title" {...register("title")} placeholder="제목을 입력하세요" className={`text-lg ${errors.title ? "border-red-500" : ""}`} disabled={disabled} />
      <FormErrorMessage error={errors.title?.message} showError={!!errors.title} />
    </div>
  );
}

// 내용 에디터 컴포넌트
interface ContentEditorProps {
  control: Control<PostFormData>;
  errors: FieldErrors<PostFormData>;
  disabled: boolean;
  onPlainTextChange: (text: string) => void;
}

function ContentEditor({ control, errors, disabled, onPlainTextChange }: ContentEditorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="content" className="flex items-center">
        내용
        <span className="text-red-500 ml-1">*</span>
      </Label>
      <div className={`${errors.content ? "border border-red-500 rounded-md" : ""} relative`}>
        <Controller
          name="content"
          control={control}
          render={({ field }: { field: { value: string; onChange: (value: string) => void } }) => (
            <RichTextEditor content={field.value} onChange={field.onChange} onPlainTextChange={onPlainTextChange} placeholder="내용을 입력하세요..." maxLength={20000} />
          )}
        />
        {disabled && (
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50 flex items-center justify-center cursor-not-allowed">
            <p className="text-gray-500 font-medium">카테고리가 필요합니다</p>
          </div>
        )}
      </div>
      <FormErrorMessage error={errors.content?.message} showError={!!errors.content} />
    </div>
  );
}

// 태그 입력 컴포넌트
interface TagsInputProps {
  tags: string[];
  tagInput: string;
  setTagInput: (value: string) => void;
  onAddTag: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemoveTag: (tag: string) => void;
  disabled: boolean;
}

function TagsInput({ tags, tagInput, setTagInput, onAddTag, onRemoveTag, disabled }: TagsInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="tags">태그</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <div key={index} className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1">
            <span>{tag}</span>
            <button type="button" onClick={() => onRemoveTag(tag)} className="ml-2 rounded-full p-1 hover:bg-blue-200 focus:outline-none" disabled={disabled}>
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <Input id="tags" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={onAddTag} placeholder="태그를 입력하고 엔터를 누르세요" disabled={disabled} />
      <p className="text-xs text-gray-500">엔터 키를 눌러 태그를 추가하세요. (선택사항)</p>
    </div>
  );
}

// 버튼 그룹 컴포넌트
interface SubmitButtonGroupProps {
  isSubmitting: boolean;
  disabled: boolean;
  onCancel: () => void;
}

function SubmitButtonGroup({ isSubmitting, disabled, onCancel }: SubmitButtonGroupProps) {
  return (
    <div className="flex justify-end gap-4 pt-4">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        취소
      </Button>
      <Button type="submit" disabled={isSubmitting || disabled} className="min-w-[100px]">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            작성 중...
          </>
        ) : disabled ? (
          "카테고리 필요"
        ) : (
          "작성하기"
        )}
      </Button>
    </div>
  );
}

function WritePageContent() {
  const router = useRouter();
  const createPostMutation = useCreatePost();
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // 통합된 상태 변수 계산
  const isFormDisabled = categories.length === 0;
  const hasCategoriesError = categories.length === 0 && !isLoadingCategories;

  // React Hook Form 설정
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      content: "",
      description: "",
      category: ""
    }
  });

  // 카테고리 데이터 로드
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const categoryData = await fetchCategories();

        if (categoryData.length > 0) {
          setCategories(categoryData);
        } else {
          console.warn("카테고리 데이터가 비어있습니다");
          setCategories([]);
        }
      } catch (error) {
        console.error("카테고리 로드 중 오류 발생:", error);
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Plain text 변경 처리 (자동 description 생성)
  const handlePlainTextChange = (plainText: string) => {
    setValue("description", plainText);
  };

  const onSubmit = async (data: PostFormData) => {
    if (isFormDisabled) {
      setError("카테고리를 가져올 수 없어 작성할 수 없습니다. 나중에 다시 시도해주세요.");
      return;
    }

    // 내용에서 첫 번째 이미지를 찾아서 featuredImage로 설정
    const imageUrl = extractFirstImageFromHtml(data.content);

    let featuredImage = null;
    if (imageUrl) {
      featuredImage = {
        url: imageUrl,
        alternativeText: data.title
      };
    }

    // description 생성
    const description = createDescription(data.content, data.description);

    setIsSubmitting(true);
    setError(null);

    try {
      // 선택된 카테고리 ID 찾기
      const selectedCategory = categories.find(cat => cat.slug === data.category);

      if (!selectedCategory) {
        setError("유효한 카테고리를 선택해주세요.");
        setIsSubmitting(false);
        return;
      }

      // Strapi API에 맞게 데이터 전달
      await createPostMutation.mutateAsync({
        title: data.title,
        content: data.content,
        description,
        category: selectedCategory.id.toString(),
        featuredImage
      });

      // 메인 페이지로 이동
      router.push("/");
    } catch (error) {
      console.error("Error creating post:", error);
      setError(error instanceof Error ? error.message : "포스트 작성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 text-center">새 글 작성</h1>
      <NotificationArea error={error} isLoadingCategories={isLoadingCategories} hasCategoriesError={hasCategoriesError} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <CategorySelect control={control} categories={categories} isLoadingCategories={isLoadingCategories} errors={errors} disabled={isFormDisabled} />
        <TitleInput register={register} errors={errors} disabled={isFormDisabled} />
        <ContentEditor control={control} errors={errors} disabled={isFormDisabled} onPlainTextChange={handlePlainTextChange} />
        <TagsInput tags={tags} tagInput={tagInput} setTagInput={setTagInput} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} disabled={isFormDisabled} />
        <SubmitButtonGroup isSubmitting={isSubmitting} disabled={isFormDisabled} onCancel={() => router.back()} />
      </form>
    </div>
  );
}

// 메인 컴포넌트 - ProtectedRoute로 감싸서 인증 체크
export default function WritePage() {
  return (
    <ProtectedRoute>
      <WritePageContent />
    </ProtectedRoute>
  );
}
