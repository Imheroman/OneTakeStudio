import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** 제목(h1)에 적용할 클래스. 테마 대응 시 사용 */
  titleClassName?: string;
  /** 설명(p)에 적용할 클래스. 테마 대응 시 사용 */
  descriptionClassName?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
  titleClassName,
  descriptionClassName,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <h1
          className={cn(
            "text-3xl font-bold tracking-tight",
            titleClassName ?? "text-gray-900"
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "text-sm",
              descriptionClassName ?? "text-gray-500"
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
