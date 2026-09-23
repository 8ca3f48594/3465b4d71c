A training fold is the rows used to fit. A held-out fold is the rows used only
to score.

Fit each learned transform on the current training fold, then apply those
parameters to the held-out fold. The held-out score then measures new data.

Stop on that score. Do not add a later topic.
