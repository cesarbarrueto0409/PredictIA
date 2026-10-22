import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getTrainingStatus, startTraining } from "@/api/model";
import { useAppStore } from "@/store/app";
import type { TrainJob, TrainRequest } from "@/types/api";

export function useTrainModel() {
  const [jobId, setJobId] = useState<string | null>(null);
  const setModelId = useAppStore((state) => state.setModelId);

  const mutation = useMutation({
    mutationFn: (request: TrainRequest) => startTraining(request),
    onSuccess: (job: TrainJob) => setJobId(job.job_id),
  });

  const job = useQuery({
    queryKey: ["train-job", jobId],
    queryFn: () => getTrainingStatus(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "failed" ? false : 700;
    },
  });

  useEffect(() => {
    if (job.data?.status === "done" && job.data.model_id) {
      setModelId(job.data.model_id);
    }
  }, [job.data, setModelId]);

  return {
    start: mutation.mutate,
    isStarting: mutation.isPending,
    startError: mutation.error,
    job: job.data,
    isPolling: job.isFetching,
    reset: () => {
      setJobId(null);
      mutation.reset();
    },
    jobId,
  };
}
