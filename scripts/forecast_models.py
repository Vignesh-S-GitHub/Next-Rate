"""Causal, reproducible one-step forecast validation for NextRate.

No random train-test shuffles or inference from future observations.
Model choice uses only the earlier validation window; the later test
window is reserved for unbiased reporting, not additional selection.
"""
import math
import statistics

METHODS=("last_close","damped_median","momentum_3","reversion_3","moving_average")


def estimate(prices,method):
    last=float(prices[-1])
    if method=="last_close":
        return last
    rets=[(b-a)/a for a,b in zip(prices,prices[1:]) if a>0]
    if not rets:
        return last
    if method=="damped_median":
        shift=statistics.median(rets[-7:])*.20
    elif method=="momentum_3":
        shift=statistics.mean(rets[-3:])*.18
    elif method=="reversion_3":
        shift=-statistics.mean(rets[-3:])*.16
    elif method=="moving_average":
        shift=(statistics.mean(prices[-5:])/last-1)*.14
    else:
        raise ValueError("Unknown forecast method")
    return last*(1+max(-.008,min(.008,shift)))


def errors(prices,method,start,stop):
    return [abs(estimate(prices[:i],method)-prices[i])/prices[i]*100
            for i in range(start,stop) if prices[i]>0]


def typical_bounds(point, half_width, step):
    """Round outwards, always keeping the point strictly inside its band."""
    low = max(step, math.floor(point * (1-half_width) / step) * step)
    high = math.ceil(point * (1+half_width) / step) * step
    return (low-step if low>=point else low,
            high+step if high<=point else high)


def typical_range(prices, method, step):
    """Earlier median forecast errors set the width; later closes test it.

    A deliberately narrower typical-move band, not a high-confidence interval.
    The later holdout never selects or shrinks the width.
    """
    n = len(prices)
    split = max(42, int(n*.75))
    if n < 55 or n-split < 12:
        return None
    residuals = []
    for i in range(15, split):
        point = max(1, round(estimate(prices[:i], method)))
        residuals.append(abs(point-prices[i])/point)
    width = statistics.median(residuals)
    covered = 0
    for i in range(split, n):
        point = max(1, round(estimate(prices[:i], method)))
        low, high = typical_bounds(point, width, step)
        covered += low <= prices[i] <= high
    return {"target_historical_coverage_pct": 50,
            "half_width": width,
            "calibration_samples": len(residuals),
            "holdout_samples": n-split,
            "holdout_covered": covered,
            "holdout_coverage_pct": round(covered/(n-split)*100, 1),
            "method": "Median absolute one-step error from earlier validation; outward-rounded bounds checked on later closes."}


def walk_forward(prices):
    n=len(prices)
    if n<55:
        return {"status":"insufficient","selected_model":"damped_median",
                "source_observations":n,
                "note":"Fewer than 55 dated closes; no robust chronological backtest."}
    split=max(42,int(n*.75))
    validations={m:errors(prices,m,15,split) for m in METHODS}
    if n-split<12 or any(len(v)<20 for v in validations.values()):
        return {"status":"insufficient","selected_model":"damped_median",
                "source_observations":n,
                "note":"Not enough non-overlapping validation and held-out samples."}
    means={m:statistics.mean(v) for m,v in validations.items()}
    best=min(means,key=means.get)
    baseline=means["last_close"]
    if best!="last_close":
        tail=min(20,len(validations[best]))
        # Prior validation must meaningfully beat naive both overall and
        # in the most recent training slice to avoid unstable choices.
        if means[best]>=baseline*.975 or (
            statistics.mean(validations[best][-tail:]) >=
            statistics.mean(validations["last_close"][-tail:])):
            best="last_close"
    out=errors(prices,best,split,n)
    naive=errors(prices,"last_close",split,n)
    chosen_score=round(statistics.mean(out),3)
    naive_score=round(statistics.mean(naive),3)
    return {
        "status":"walk_forward",
        "selected_model":best,
        "source_observations":n,
        "validation_samples":len(validations[best]),
        "validation_mape_pct":round(means[best],3),
        "validation_naive_mape_pct":round(baseline,3),
        "holdout_samples":len(out),
        "holdout_mape_pct":chosen_score,
        "holdout_naive_mape_pct":naive_score,
        "holdout_beats_naive":chosen_score<naive_score,
        "note":"Earlier validation selected the strategy; untouched chronological holdout used only to report error. Lower MAPE is better.",
    }
