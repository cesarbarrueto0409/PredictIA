import { useRef, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { USE_MOCKS } from "@/api/client";
import { uploadDataset } from "@/api/datasets";
import { useTrainModel } from "@/hooks/useTrain";
import { useAppStore } from "@/store/app";
import { validateSalesCsv, type CsvValidation } from "@/lib/csv";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { allSeries } from "@/mocks/generate";
import { downloadText } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

function buildSampleCsv(): string {
  const families = new Set(["PRODUCE", "DAIRY", "BEVERAGES", "GROCERY I"]);
  const lines = ["id,date,store_nbr,family,sales,onpromotion"];
  let id = 1;
  for (const series of allSeries()) {
    if (!families.has(series.family)) continue;
    for (const point of series.points.filter((item) => !item.is_future).slice(0, 60)) {
      lines.push(
        `${id},${point.date},${series.store_nbr},${series.family},${point.actual ?? 0},${point.onpromotion ? 1 : 0}`,
      );
      id += 1;
    }
  }
  return lines.join("\n");
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-small">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-ink">{pct} %</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-active"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SummaryStrip({ summary }: { summary: NonNullable<CsvValidation["summary"]> }) {
  const items = [
    { label: "Rango de fechas", value: `${formatDate(summary.date_min)} — ${formatDate(summary.date_max)}` },
    { label: "Filas leídas", value: formatNumber(summary.n_rows) },
    { label: "Tiendas", value: formatNumber(summary.n_stores) },
    { label: "Familias", value: formatNumber(summary.n_families) },
    { label: "% de ventas en cero", value: formatPercent(summary.pct_zero_sales) },
  ];
  return (
    <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <p className="text-small text-muted">{item.label}</p>
          <p className="mt-0.5 break-words text-body font-medium tabular-nums text-ink">{item.value}</p>
        </div>
      ))}
    </Card>
  );
}

export function Upload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<CsvValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<unknown>(null);

  const datasetId = useAppStore((state) => state.datasetId);
  const summary = useAppStore((state) => state.datasetSummary);
  const setDataset = useAppStore((state) => state.setDataset);
  const train = useTrainModel();

  const handleFile = async (nextFile: File | null) => {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setValidation({
        ok: false,
        errors: ["El archivo debe ser un CSV (.csv)."],
        warnings: [],
        rowCount: 0,
        scannedRows: 0,
        summary: null,
        sampled: false,
      });
      setFile(nextFile);
      return;
    }
    setFile(nextFile);
    setValidation(null);
    setUploadError(null);
    setUploadProgress(0);
    setDataset(null, null);
    train.reset();
    setValidating(true);
    const result = await validateSalesCsv(nextFile);
    setValidation(result);
    setValidating(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0] ?? null;
    void handleFile(dropped);
  };

  const handleUpload = async () => {
    if (!file || !validation?.summary) return;
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    try {
      const response = await uploadDataset(file, validation.summary, setUploadProgress);
      setDataset(response.dataset_id, response.summary);
      setUploadProgress(1);
    } catch (error) {
      setUploadError(error);
    } finally {
      setUploading(false);
    }
  };

  const job = train.job;
  const training = job?.status === "queued" || job?.status === "running";
  const done = job?.status === "done";
  const failed = job?.status === "failed";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carga de datos"
        subtitle="Sube el historial de ventas en CSV. Validamos las primeras 1.000 filas antes de entrenar."
        actions={
          USE_MOCKS ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadText("ejemplo_ventas.csv", buildSampleCsv())}
            >
              <Icon name="download" size={14} />
              Descargar CSV de ejemplo
            </Button>
          ) : undefined
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Panel
            title="Archivo de ventas"
            description="Formato esperado del dataset: id, date, store_nbr, family, sales, onpromotion."
            skeleton="text"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={
                dragging
                  ? "flex min-h-[190px] cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-accent bg-[color-mix(in_srgb,var(--accent)_6%,var(--surface))] px-6 py-8 text-center"
                  : "flex min-h-[190px] cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-control bg-raised/40 px-6 py-8 text-center transition-colors hover:border-accent"
              }
            >
              <Icon name="upload" size={24} className="text-accent" />
              <p className="text-section font-medium text-ink">
                {file ? file.name : "Arrastra el CSV aquí"}
              </p>
              <p className="text-body text-muted">
                {file
                  ? `${formatNumber(file.size / 1024, 0)} KB · haz clic para cambiar el archivo`
                  : "o haz clic para elegir un archivo"}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </div>

            {validating && (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
            )}

            {validation && (
              <div className="mt-4 space-y-3">
                {validation.errors.length > 0 && (
                  <div
                    role="alert"
                    className="rounded-card border border-[color-mix(in_srgb,var(--negative)_35%,var(--border))] bg-[var(--pill-negative-bg)] p-4"
                  >
                    <p className="flex items-center gap-2 text-body font-medium text-[var(--pill-negative-ink)]">
                      <Icon name="alert" size={16} />
                      El archivo tiene {validation.errors.length} problema
                      {validation.errors.length === 1 ? "" : "s"}
                    </p>
                    <ul className="mt-2 space-y-1 text-small text-[var(--pill-negative-ink)]">
                      {validation.errors.map((error, index) => (
                        <li key={`${error}-${index}`}>· {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validation.ok && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="positive">
                      <Icon name="check" size={12} />
                      Archivo válido
                    </Badge>
                    <span className="text-small text-muted">
                      {validation.scannedRows} filas revisadas · {formatNumber(validation.rowCount)} leídas
                    </span>
                  </div>
                )}
                {validation.warnings.map((warning) => (
                  <p key={warning} className="text-small text-[var(--pill-warning-ink)]">
                    {warning}
                  </p>
                ))}
              </div>
            )}
          </Panel>

          {validation?.summary && validation.ok && (
            <>
              <SummaryStrip summary={validation.summary} />

              {uploadError ? (
                <ErrorState error={uploadError} onRetry={() => void handleUpload()} compact />
              ) : null}

              {datasetId ? (
                <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="flex items-center gap-2 text-body font-medium text-ink">
                      <Icon name="check" size={16} className="text-positive" />
                      Dataset cargado
                    </p>
                    <p className="mt-0.5 font-mono text-small text-muted">
                      {datasetId} · {summary ? formatNumber(summary.n_rows) : 0} filas
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setDataset(null, null);
                      setUploadProgress(0);
                    }}
                  >
                    Reemplazar
                  </Button>
                </Card>
              ) : (
                <Card className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-body font-medium text-ink">Sube el dataset al servidor</p>
                      <p className="text-small text-muted">
                        El backend calcula el resumen completo y deja el dataset listo para entrenar.
                      </p>
                    </div>
                    <Button onClick={() => void handleUpload()} disabled={uploading}>
                      <Icon name="upload" size={14} />
                      {uploading ? "Subiendo…" : "Subir dataset"}
                    </Button>
                  </div>
                  {uploading && (
                    <div className="mt-4">
                      <ProgressBar value={uploadProgress} label="Subiendo archivo" />
                    </div>
                  )}
                </Card>
              )}

              <Panel
                title="Entrenamiento"
                description="Modelo global para todas las series, con intervalos p10–p90 y baseline de la semana anterior."
                skeleton="text"
                actions={
                  USE_MOCKS ? <Badge tone="neutral">Simulado en demo</Badge> : undefined
                }
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() =>
                        datasetId &&
                        train.start({
                          dataset_id: datasetId,
                          horizon_days: 28,
                          validation_days: 28,
                          quantiles: [0.1, 0.5, 0.9],
                        })
                      }
                      disabled={!datasetId || training || train.isStarting}
                    >
                      <Icon name="spark" size={14} />
                      {done ? "Volver a entrenar" : "Entrenar modelo"}
                    </Button>
                    {!datasetId && (
                      <span className="text-small text-muted">
                        Sube el dataset para habilitar el entrenamiento.
                      </span>
                    )}
                    {done && (
                      <Badge tone="positive">
                        <Icon name="check" size={12} />
                        Modelo listo
                      </Badge>
                    )}
                  </div>

                  {(train.isStarting || job) && (
                    <div className="space-y-2">
                      <ProgressBar
                        value={done ? 1 : (job?.progress ?? 0)}
                        label={job?.message ?? "Enviando trabajo de entrenamiento"}
                      />
                      {job && (
                        <p className="text-small text-muted">
                          Estado: {job.status === "queued" ? "en cola" : job.status === "running" ? "entrenando" : job.status === "done" ? "listo" : "falló"}
                          {job.model_id ? ` · modelo ${job.model_id}` : ""}
                        </p>
                      )}
                    </div>
                  )}

                  {train.startError && (
                    <ErrorState
                      error={train.startError}
                      onRetry={() =>
                        datasetId &&
                        train.start({
                          dataset_id: datasetId,
                          horizon_days: 28,
                          validation_days: 28,
                          quantiles: [0.1, 0.5, 0.9],
                        })
                      }
                      compact
                    />
                  )}
                  {failed && (
                    <ErrorState
                      error={new Error(job?.message ?? "El entrenamiento falló.")}
                      onRetry={() =>
                        datasetId &&
                        train.start({
                          dataset_id: datasetId,
                          horizon_days: 28,
                          validation_days: 28,
                          quantiles: [0.1, 0.5, 0.9],
                        })
                      }
                      compact
                    />
                  )}
                  {done && (
                    <div className="flex flex-wrap gap-2">
                      <Link to="/modelo" className={buttonClasses("primary", "sm")}>
                        Ver resultados del modelo
                        <Icon name="arrowRight" size={12} />
                      </Link>
                      <Link to="/pedidos" className={buttonClasses("secondary", "sm")}>
                        Ver pedido sugerido
                      </Link>
                    </div>
                  )}
                </div>
              </Panel>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-section font-semibold text-ink">Columnas del CSV</h2>
            <p className="mt-1 text-small text-muted">
              El encabezado debe existir tal cual. Las columnas extra se ignoran.
            </p>
            <dl className="mt-4 space-y-3 text-small">
              {[
                ["id", "Identificador de la fila"],
                ["date", "Fecha en formato AAAA-MM-DD"],
                ["store_nbr", "Número entero de tienda"],
                ["family", "Familia de producto"],
                ["sales", "Unidades vendidas (≥ 0)"],
                ["onpromotion", "Ítems en promoción ese día"],
              ].map(([name, description]) => (
                <div key={name} className="grid grid-cols-[92px_1fr] gap-2">
                  <dt className="font-mono text-[12px] text-accent">{name}</dt>
                  <dd className="text-muted">{description}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-section font-semibold text-ink">Qué pasa al entrenar</h2>
            <ul className="mt-3 space-y-3 text-small">
              {[
                "Limpieza de ventas y features con rezago de al menos 14 días.",
                "Entrenamiento del modelo global para todas las tiendas y familias.",
                "Cálculo de intervalos p10–p90 y comparación con el baseline.",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-muted">
                  <Icon name="check" size={14} className="mt-0.5 flex-none text-positive" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-rule pt-3 text-small text-muted">
              La validación usa las últimas 4 semanas del historial. No se usan ventas futuras para construir features.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-section font-semibold text-ink">Sobre el modo demo</h2>
            <p className="mt-1 text-small text-muted">
              {USE_MOCKS
                ? "Ahora mismo la app usa datos simulados. El CSV se valida en el navegador y el entrenamiento es simulado, para ensayar la demo sin backend."
                : "La app está conectada a la API real. La subida usa multipart en POST /datasets y el progreso viene de GET /train/{job_id}."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
