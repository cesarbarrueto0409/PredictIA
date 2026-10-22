import type {
  HorizonResponse,
  MetricsResponse,
  RankingResponse,
  TrainJob,
  TrainRequest,
} from "@/types/api";
import { get, post, type QueryParams } from "./client";

export function getMetrics(params?: QueryParams): Promise<MetricsResponse> {
  return get<MetricsResponse>("/metrics", params);
}

export function getHorizon(params?: QueryParams): Promise<HorizonResponse> {
  return get<HorizonResponse>("/metrics/horizon", params);
}

export function getRanking(params: QueryParams): Promise<RankingResponse> {
  return get<RankingResponse>("/metrics/ranking", params);
}

export function startTraining(body: TrainRequest): Promise<TrainJob> {
  return post<TrainJob>("/train", body);
}

export function getTrainingStatus(jobId: string): Promise<TrainJob> {
  return get<TrainJob>(`/train/${encodeURIComponent(jobId)}`);
}
