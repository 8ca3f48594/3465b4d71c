# Machine-learning fundamentals

## Scope

Explain training, prediction, features, evaluation, and data leakage.

## Prerequisites and distinctions

Identify the prediction target, input features, and split between training and evaluation data. Separate fitting from transformation.

## Teaching sequence

Trace one example through preprocessing, prediction, and measurement. Show where each learned parameter comes from.

## Common misconceptions

A good training score does not establish performance on new data. Information from evaluation data can leak through preprocessing.

## Example 1

A scaler estimates parameters such as a mean from its fit data. Fitting it on the training set and applying it to the test set preserves that separation. Fitting on all data first lets test information influence preprocessing.

## Example 2

A pipeline can fit preprocessing and an estimator together within each cross-validation training fold. This helps keep the held-out fold outside the fit operations, provided the pipeline contains the relevant learned transformations.

## Analogies and limits

Practice questions and unseen exam questions can illustrate the training/evaluation split. Human learning and model optimization differ, so the analogy establishes only the separation of data.

## Sources and review

- [Reference](https://scikit-learn.org/stable/common_pitfalls.html), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
