export type MemberInterestActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialMemberInterestState: MemberInterestActionState = {
  status: "idle",
  message: "",
};
