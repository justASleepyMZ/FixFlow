import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const StarRating = ({
  rating,
  maxStars = 5,
  size = "sm",
  showValue = false,
  interactive = false,
  onChange,
  className,
}: StarRatingProps) => {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i < Math.round(rating);
        return (
          <Star
            key={i}
            className={cn(
              sizeClasses[size],
              filled
                ? "fill-secondary text-secondary"
                : "fill-muted text-muted-foreground/40",
              interactive && "cursor-pointer hover:scale-110 transition-transform"
            )}
            onClick={() => interactive && onChange?.(i + 1)}
          />
        );
      })}
      {showValue && (
        <span className="ml-1 text-xs font-medium text-muted-foreground">
          {rating > 0 ? rating.toFixed(1) : "N/A"}
        </span>
      )}
    </div>
  );
};

export default StarRating;
