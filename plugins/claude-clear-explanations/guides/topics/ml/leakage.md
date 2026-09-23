When you train a machine-learning model to predict a house price, a feature is an input
such as the house's size. Feature leakage is when evaluation data shapes that
training, so the test score looks better than performance on new houses.

- Training rows: the examples the model learns from.
- Test rows: held-out examples used only to score.
- Fit: compute a mean from rows.
- Transform: apply the mean to a row.

The training sizes are 1.0, 1.2, and 1.4.
Their sum is 3.6.
The training mean is 3.6 / 3 = 1.2.

If the mean is fit on training and test rows together, the transform moves the
test values. The reported test score is inflated.
