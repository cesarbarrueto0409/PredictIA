"""Shared glue: raw data -> features -> model -> outputs. Used by the app and smoke test."""
from src import data, model


def run_all(train, stores=None, holidays=None, transactions=None, oil=None) -> dict:
    features = data.build_features(train, stores, holidays, transactions, oil)
    predictions, metrics, fitted = model.run_model(features)
    return {
        "features": features,
        "predictions": predictions,
        "metrics": metrics,
        "model": fitted,
        "importance": model.feature_importance(fitted),
    }
