import { Header } from "@/components/layout/Header";
import { OwnerForm } from "@/components/owners/OwnerForm";

export default function NewOwnerPage() {
  return (
    <div style={{ flex: 1 }}>
      <Header title="Add Owner" />
      <div style={{ padding: "0 32px 32px" }}>
        <OwnerForm />
      </div>
    </div>
  );
}
