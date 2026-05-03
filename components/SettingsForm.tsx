"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface Education {
  id?: string;
  schoolName: string;
  major: string;
  degree: "학사" | "석사" | "박사";
  startDate: string;
  endDate?: string | null;
  graduationStatus: "재학중" | "졸업" | "졸업예정" | "중퇴" | "휴학중";
}

interface Career {
  id?: string;
  companyName: string;
  role: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
}

interface Certification {
  id?: string;
  name: string;
  grade?: string | null;
}

interface Activity {
  id?: string;
  title: string;
  role: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
}

interface InitialData {
  name?: string;
  educations?: Array<Omit<Education, "graduationStatus" | "degree"> & { graduationStatus: string; degree?: string | null }>;
  careers?: Career[];
  certifications?: Certification[];
  activities?: Activity[];
}

type Snapshot = {
  name: string;
  educations: Education[];
  careers: Career[];
  certifications: Certification[];
  activities: Activity[];
};

function newEducation(): Education {
  return { schoolName: "", major: "", degree: "학사", startDate: "", endDate: "", graduationStatus: "재학중" };
}
function newCareer(): Career {
  return { companyName: "", role: "", startDate: "", endDate: "", description: "" };
}
function newCertification(): Certification {
  return { name: "", grade: "" };
}
function newActivity(): Activity {
  return { title: "", role: "", startDate: "", endDate: "", description: "" };
}

function parseInitial(initialData: InitialData): Snapshot {
  return {
    name: initialData.name ?? "",
    educations: initialData.educations?.length
      ? initialData.educations.map((e) => ({
          ...e,
          degree: (e.degree as Education["degree"]) ?? "학사",
          graduationStatus: e.graduationStatus as Education["graduationStatus"],
        }))
      : [],
    careers: initialData.careers ?? [],
    certifications: initialData.certifications ?? [],
    activities: initialData.activities ?? [],
  };
}

export default function SettingsForm({ initialData }: { initialData: InitialData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => parseInitial(initialData));

  const [name, setName] = useState(snapshot.name);
  const [educations, setEducations] = useState<Education[]>(snapshot.educations);
  const [careers, setCareers] = useState<Career[]>(snapshot.careers);
  const [certifications, setCertifications] = useState<Certification[]>(snapshot.certifications);
  const [activities, setActivities] = useState<Activity[]>(snapshot.activities);

  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const initials = name.trim() ? name.trim()[0] : "?";

  function handleEdit() {
    setSaveStatus("idle");
    setIsEditing(true);
  }

  function handleCancel() {
    setName(snapshot.name);
    setEducations(snapshot.educations);
    setCareers(snapshot.careers);
    setCertifications(snapshot.certifications);
    setActivities(snapshot.activities);
    setSaveStatus("idle");
    setIsEditing(false);
  }

  async function handleSave() {
    if (!name.trim()) { setSaveError("이름을 입력해주세요"); setSaveStatus("error"); return; }
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), educations, careers, certifications, activities }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "저장에 실패했습니다");
        setSaveStatus("error");
      } else {
        setSnapshot({ name: name.trim(), educations, careers, certifications, activities });
        setIsEditing(false);
      }
    } catch {
      setSaveError("네트워크 오류가 발생했습니다");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== name.trim()) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? "탈퇴에 실패했습니다");
        setDeleting(false);
        return;
      }
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setDeleteError("네트워크 오류가 발생했습니다");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5 pb-10">
      {/* 프로필 헤더 카드 */}
      <div className="card px-6 py-5 flex items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
          <span className="text-white text-xl font-bold">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">이름</p>
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full bg-transparent text-lg font-semibold text-gray-900 dark:text-slate-50 placeholder-gray-300 dark:placeholder-slate-600 focus:outline-none border-b border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500 focus:border-blue-500 dark:focus:border-blue-400 pb-0.5 transition-colors"
            />
          ) : (
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-50">{name || "—"}</p>
          )}
        </div>
      </div>

      {/* 학력 */}
      <Section title="학력" count={educations.length} onAdd={isEditing ? () => setEducations((p) => [...p, newEducation()]) : undefined}>
        {educations.length === 0 ? (
          <EmptyState text="학력 정보가 없습니다" />
        ) : educations.map((edu, i) => (
          <ItemCard key={i} onDelete={isEditing ? () => setEducations((p) => p.filter((_, idx) => idx !== i)) : undefined}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isEditing ? (
                <>
                  <Field label="학교명">
                    <input type="text" value={edu.schoolName} onChange={(e) => setEducations((p) => p.map((item, idx) => idx === i ? { ...item, schoolName: e.target.value } : item))} placeholder="OO대학교" className="input" />
                  </Field>
                  <Field label="전공">
                    <input type="text" value={edu.major} onChange={(e) => setEducations((p) => p.map((item, idx) => idx === i ? { ...item, major: e.target.value } : item))} placeholder="컴퓨터공학" className="input" />
                  </Field>
                  <Field label="학위">
                    <select value={edu.degree} onChange={(e) => setEducations((p) => p.map((item, idx) => idx === i ? { ...item, degree: e.target.value as Education["degree"] } : item))} className="input">
                      {["학사", "석사", "박사"].map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </Field>
                  <Field label="입학일">
                    <input type="month" value={edu.startDate} onChange={(e) => setEducations((p) => p.map((item, idx) => idx === i ? { ...item, startDate: e.target.value } : item))} className="input" />
                  </Field>
                  <Field label="졸업일">
                    <input type="month" value={edu.endDate ?? ""} onChange={(e) => setEducations((p) => p.map((item, idx) => idx === i ? { ...item, endDate: e.target.value } : item))} className="input" />
                  </Field>
                  <Field label="졸업상태">
                    <select value={edu.graduationStatus} onChange={(e) => setEducations((p) => p.map((item, idx) => idx === i ? { ...item, graduationStatus: e.target.value as Education["graduationStatus"] } : item))} className="input">
                      {["재학중", "졸업", "졸업예정", "중퇴", "휴학중"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </>
              ) : (
                <>
                  <ViewField label="학교명" value={edu.schoolName} />
                  <ViewField label="전공" value={edu.major} />
                  <ViewField label="학위" value={edu.degree} />
                  <ViewField label="졸업상태" value={edu.graduationStatus} />
                  <ViewField label="입학일" value={edu.startDate} />
                  <ViewField label="졸업일" value={edu.endDate} />
                </>
              )}
            </div>
          </ItemCard>
        ))}
      </Section>

      {/* 경력 */}
      <Section title="경력" count={careers.length} onAdd={isEditing ? () => setCareers((p) => [...p, newCareer()]) : undefined}>
        {careers.length === 0 ? (
          <EmptyState text="경력 정보가 없습니다" />
        ) : careers.map((career, i) => (
          <ItemCard key={i} onDelete={isEditing ? () => setCareers((p) => p.filter((_, idx) => idx !== i)) : undefined}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isEditing ? (
                <>
                  <Field label="회사명">
                    <input type="text" value={career.companyName} onChange={(e) => setCareers((p) => p.map((item, idx) => idx === i ? { ...item, companyName: e.target.value } : item))} placeholder="(주)OO회사" className="input" />
                  </Field>
                  <Field label="직무">
                    <input type="text" value={career.role} onChange={(e) => setCareers((p) => p.map((item, idx) => idx === i ? { ...item, role: e.target.value } : item))} placeholder="백엔드 개발자" className="input" />
                  </Field>
                  <Field label="시작일">
                    <input type="month" value={career.startDate} onChange={(e) => setCareers((p) => p.map((item, idx) => idx === i ? { ...item, startDate: e.target.value } : item))} className="input" />
                  </Field>
                  <Field label="종료일">
                    <input type="month" value={career.endDate ?? ""} onChange={(e) => setCareers((p) => p.map((item, idx) => idx === i ? { ...item, endDate: e.target.value } : item))} className="input" />
                  </Field>
                </>
              ) : (
                <>
                  <ViewField label="회사명" value={career.companyName} />
                  <ViewField label="직무" value={career.role} />
                  <ViewField label="시작일" value={career.startDate} />
                  <ViewField label="종료일" value={career.endDate} />
                </>
              )}
            </div>
            {isEditing ? (
              <Field label="업무 설명">
                <textarea value={career.description ?? ""} onChange={(e) => setCareers((p) => p.map((item, idx) => idx === i ? { ...item, description: e.target.value } : item))} placeholder="주요 업무 내용을 간략히 적어주세요" rows={2} className="input resize-none" />
              </Field>
            ) : (
              career.description ? <ViewField label="업무 설명" value={career.description} /> : null
            )}
          </ItemCard>
        ))}
      </Section>

      {/* 자격증 */}
      <Section title="자격증" count={certifications.length} onAdd={isEditing ? () => setCertifications((p) => [...p, newCertification()]) : undefined}>
        {certifications.length === 0 ? (
          <EmptyState text="자격증 정보가 없습니다" />
        ) : certifications.map((cert, i) => (
          <ItemCard key={i} onDelete={isEditing ? () => setCertifications((p) => p.filter((_, idx) => idx !== i)) : undefined}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isEditing ? (
                <>
                  <Field label="자격증명">
                    <input type="text" value={cert.name} onChange={(e) => setCertifications((p) => p.map((item, idx) => idx === i ? { ...item, name: e.target.value } : item))} placeholder="정보처리기사" className="input" />
                  </Field>
                  <Field label="등급 / 점수 (선택)">
                    <input type="text" value={cert.grade ?? ""} onChange={(e) => setCertifications((p) => p.map((item, idx) => idx === i ? { ...item, grade: e.target.value } : item))} placeholder="예) 1급, 900점" className="input" />
                  </Field>
                </>
              ) : (
                <>
                  <ViewField label="자격증명" value={cert.name} />
                  <ViewField label="등급 / 점수" value={cert.grade} />
                </>
              )}
            </div>
          </ItemCard>
        ))}
      </Section>

      {/* 대외활동 */}
      <Section title="대외활동" count={activities.length} onAdd={isEditing ? () => setActivities((p) => [...p, newActivity()]) : undefined}>
        {activities.length === 0 ? (
          <EmptyState text="대외활동 정보가 없습니다" />
        ) : activities.map((act, i) => (
          <ItemCard key={i} onDelete={isEditing ? () => setActivities((p) => p.filter((_, idx) => idx !== i)) : undefined}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isEditing ? (
                <>
                  <Field label="활동명">
                    <input type="text" value={act.title} onChange={(e) => setActivities((p) => p.map((item, idx) => idx === i ? { ...item, title: e.target.value } : item))} placeholder="UX 스터디" className="input" />
                  </Field>
                  <Field label="역할">
                    <input type="text" value={act.role} onChange={(e) => setActivities((p) => p.map((item, idx) => idx === i ? { ...item, role: e.target.value } : item))} placeholder="팀장" className="input" />
                  </Field>
                  <Field label="시작일">
                    <input type="month" value={act.startDate} onChange={(e) => setActivities((p) => p.map((item, idx) => idx === i ? { ...item, startDate: e.target.value } : item))} className="input" />
                  </Field>
                  <Field label="종료일">
                    <input type="month" value={act.endDate ?? ""} onChange={(e) => setActivities((p) => p.map((item, idx) => idx === i ? { ...item, endDate: e.target.value } : item))} className="input" />
                  </Field>
                </>
              ) : (
                <>
                  <ViewField label="활동명" value={act.title} />
                  <ViewField label="역할" value={act.role} />
                  <ViewField label="시작일" value={act.startDate} />
                  <ViewField label="종료일" value={act.endDate} />
                </>
              )}
            </div>
            {isEditing ? (
              <Field label="활동 설명">
                <textarea value={act.description ?? ""} onChange={(e) => setActivities((p) => p.map((item, idx) => idx === i ? { ...item, description: e.target.value } : item))} placeholder="활동 내용을 간략히 적어주세요" rows={2} className="input resize-none" />
              </Field>
            ) : (
              act.description ? <ViewField label="활동 설명" value={act.description} /> : null
            )}
          </ItemCard>
        ))}
      </Section>

      {/* 버튼 영역 */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {saveStatus === "error" && <p className="text-red-500 text-sm">{saveError}</p>}
        {isEditing ? (
          <>
            <button onClick={handleCancel} className="btn-secondary px-6">취소</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
              {saving ? "저장 중..." : "저장하기"}
            </button>
          </>
        ) : (
          <button onClick={handleEdit} className="btn-primary px-8">편집하기</button>
        )}
      </div>

      {/* 위험 구역 */}
      <div className="mt-4 rounded-2xl border border-red-100 dark:border-red-900/40 overflow-hidden">
        <div className="px-6 py-4 bg-red-50/60 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/40">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">주의</h3>
        </div>
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200">계정 삭제</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">모든 데이터가 영구 삭제되며 복구할 수 없습니다</p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="shrink-0 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            회원 탈퇴
          </button>
        </div>
      </div>

      {/* 탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowDeleteModal(false); setDeleteConfirm(""); setDeleteError(""); } }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-5 space-y-4">
              <div className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-50">정말 탈퇴하시겠습니까?</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  프로필, 채용공고, 면접 기록이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  확인을 위해 이름 <span className="font-bold text-gray-700 dark:text-slate-200">{name.trim()}</span>을 입력하세요
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={name.trim()}
                  className="input"
                  autoFocus
                />
              </div>
              {deleteError && <p className="text-red-500 text-sm">{deleteError}</p>}
            </div>
            <div className="px-6 pb-6 flex gap-2.5">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); setDeleteError(""); }}
                className="flex-1 btn-secondary"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== name.trim() || deleting}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {deleting ? "탈퇴 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 하위 컴포넌트 ──────────────────────────────────────────

function Section({
  title,
  count,
  onAdd,
  children,
}: {
  title: string;
  count: number;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-gray-800 dark:text-slate-100">{title}</span>
          {count > 0 && (
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            추가
          </button>
        )}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function ItemCard({ children, onDelete }: { children: React.ReactNode; onDelete?: () => void }) {
  return (
    <div className="relative rounded-xl border border-gray-100 dark:border-slate-600 bg-gray-50/60 dark:bg-slate-700/30 p-4 space-y-3">
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-md text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label="삭제"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-6 flex flex-col items-center gap-1.5 text-gray-400 dark:text-slate-600">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function ViewField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</p>
      <p className="text-sm text-gray-900 dark:text-slate-100">{value || "—"}</p>
    </div>
  );
}
