A Docker image is packaged files and startup configuration, like a recipe.
A container is one running instance of that image, like a dish made from that recipe.

A write to the container (the running dish) goes in that instance's writable layer, not the image (the recipe).

You start a container (the running dish), write a log file, then replace the container (the running dish) from the same image (the recipe). The new instance gets a fresh writable layer. The log is gone.
