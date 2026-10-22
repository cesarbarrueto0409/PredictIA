import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Overview } from "@/pages/Overview";
import { Upload } from "@/pages/Upload";
import { Explore } from "@/pages/Explore";
import { Model } from "@/pages/Model";
import { Business } from "@/pages/Business";
import { Orders } from "@/pages/Orders";
import { NotFound } from "@/pages/NotFound";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Overview />} />
        <Route path="carga" element={<Upload />} />
        <Route path="exploracion" element={<Explore />} />
        <Route path="modelo" element={<Model />} />
        <Route path="impacto" element={<Business />} />
        <Route path="pedidos" element={<Orders />} />
        <Route path="inicio" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
