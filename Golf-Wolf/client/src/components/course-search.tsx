import { useState } from "react";
import { useSearchCourses, useSetCourse } from "@/hooks/use-game";
import type { Course, CourseTee } from "@shared/routes";
import { Search, CheckCircle, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CourseSearchProps {
  gameId: string;
  onComplete: () => void;
}

export function CourseSearch({ gameId, onComplete }: CourseSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTee, setSelectedTee] = useState<CourseTee | null>(null);

  const { data, isLoading } = useSearchCourses(query);
  const setCourse = useSetCourse();

  const allTees: CourseTee[] = selectedCourse
    ? [...(selectedCourse.tees.male ?? []), ...(selectedCourse.tees.female ?? [])]
    : [];

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setSelectedTee(null);
  };

  const handleConfirm = () => {
    if (!selectedCourse || !selectedTee) return;
    const name = selectedCourse.course_name && selectedCourse.course_name !== selectedCourse.club_name
      ? `${selectedCourse.club_name} – ${selectedCourse.course_name}`
      : selectedCourse.club_name;
    setCourse.mutate(
      {
        gameId,
        data: {
          courseId: selectedCourse.id,
          courseName: name,
          selectedTee: selectedTee.tee_name,
          coursePar: selectedTee.holes.map(h => h.par),
          courseYardage: selectedTee.holes.map(h => h.yardage),
        },
      },
      { onSuccess: onComplete }
    );
  };

  const totalPar = selectedTee?.holes.reduce((s, h) => s + h.par, 0) ?? 0;
  const totalYards = selectedTee?.holes.reduce((s, h) => s + h.yardage, 0) ?? 0;

  if (selectedCourse && selectedTee) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-foreground">{selectedCourse.club_name}</p>
              {selectedCourse.course_name !== selectedCourse.club_name && (
                <p className="text-sm text-muted-foreground">{selectedCourse.course_name}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedTee.tee_name} tee · Par {totalPar} · {totalYards.toLocaleString()} yards
              </p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          </div>
        </div>

        {/* Hole grid preview */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/60">
                <th className="text-left px-2 py-1.5 font-semibold text-muted-foreground rounded-tl-lg">Hole</th>
                {selectedTee.holes.map((_, i) => (
                  <th key={i} className="px-1.5 py-1.5 font-semibold text-muted-foreground text-center w-8">{i + 1}</th>
                ))}
                <th className="px-2 py-1.5 font-semibold text-muted-foreground text-center rounded-tr-lg">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-2 py-1.5 font-semibold text-foreground">Par</td>
                {selectedTee.holes.map((h, i) => (
                  <td key={i} className="px-1.5 py-1.5 text-center text-foreground">{h.par}</td>
                ))}
                <td className="px-2 py-1.5 text-center font-bold text-foreground">{totalPar}</td>
              </tr>
              <tr className="border-t border-border bg-muted/20">
                <td className="px-2 py-1.5 font-semibold text-foreground">Yds</td>
                {selectedTee.holes.map((h, i) => (
                  <td key={i} className="px-1.5 py-1.5 text-center text-muted-foreground">{h.yardage}</td>
                ))}
                <td className="px-2 py-1.5 text-center font-bold text-muted-foreground">{totalYards.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => { setSelectedTee(null); setSelectedCourse(null); setQuery(""); }}
          >
            Change Course
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setSelectedTee(null)}
          >
            Change Tee
          </Button>
        </div>

        <Button
          size="lg"
          className="w-full h-12 font-bold"
          disabled={setCourse.isPending}
          onClick={handleConfirm}
        >
          {setCourse.isPending ? "Saving..." : "Confirm Course"}
        </Button>
      </div>
    );
  }

  if (selectedCourse) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-primary" />
            <p className="font-bold text-foreground">{selectedCourse.club_name}</p>
          </div>
          {selectedCourse.course_name !== selectedCourse.club_name && (
            <p className="text-sm text-muted-foreground mb-1 ml-6">{selectedCourse.course_name}</p>
          )}
          <p className="text-xs text-muted-foreground ml-6">
            {[selectedCourse.location.city, selectedCourse.location.state, selectedCourse.location.country].filter(Boolean).join(", ")}
          </p>
        </div>

        <p className="text-sm font-semibold text-foreground px-1">Select a tee:</p>

        {allTees.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No tee data available for this course.</p>
        ) : (
          <div className="space-y-2">
            {allTees.map(tee => (
              <button
                key={tee.tee_name}
                onClick={() => setSelectedTee(tee)}
                className="w-full flex items-center justify-between bg-white border border-border rounded-xl px-4 py-3 hover:border-primary/50 hover:bg-muted/30 transition-all text-left"
              >
                <div>
                  <p className="font-semibold text-foreground">{tee.tee_name}</p>
                  <p className="text-xs text-muted-foreground">Par {tee.par_total} · {tee.total_yards.toLocaleString()} yards</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => { setSelectedCourse(null); setQuery(""); }}
          className="text-sm text-muted-foreground underline w-full text-center"
        >
          Back to search
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for a golf course..."
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {isLoading && query.length >= 2 && (
        <p className="text-sm text-muted-foreground text-center animate-pulse">Searching...</p>
      )}

      {data?.courses && data.courses.length > 0 && (
        <div className="space-y-2">
          {data.courses.map(course => (
            <button
              key={course.id}
              onClick={() => handleSelectCourse(course)}
              className="w-full flex items-center justify-between bg-white border border-border rounded-xl px-4 py-3 hover:border-primary/50 hover:bg-muted/30 transition-all text-left"
            >
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{course.club_name}</p>
                {course.course_name !== course.club_name && (
                  <p className="text-xs text-muted-foreground truncate">{course.course_name}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {[course.location.city, course.location.state, course.location.country].filter(Boolean).join(", ")}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
            </button>
          ))}
        </div>
      )}

      {data?.courses && data.courses.length === 0 && query.length >= 2 && !isLoading && (
        <p className="text-sm text-muted-foreground text-center py-4">No courses found. Try a different search.</p>
      )}

      {query.length < 2 && (
        <p className="text-xs text-muted-foreground text-center">Type at least 2 characters to search.</p>
      )}
    </div>
  );
}
