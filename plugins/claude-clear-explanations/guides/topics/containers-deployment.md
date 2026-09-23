# Containers and deployment

## Scope

Explain images, running containers, configuration, and deployment changes.

## Prerequisites and distinctions

Separate an image from a container instance, and application files from persistent data. Identify the host platform.

## Teaching sequence

Trace build, start, configuration, storage, and replacement for one application.

## Common misconceptions

An image does not contain a separate guest kernel for each Linux container. Replacing a container does not by itself preserve data written only to its writable layer.

## Example 1

An image supplies packaged files and startup configuration. Starting a container creates a running instance from that image. Several containers can start from the same image with different runtime configuration.

## Example 2

A Linux container isolates processes while using a Linux host kernel. On a non-Linux desktop, a virtual machine may supply that kernel. The platform layer matters when explaining what is shared.

## Analogies and limits

An image resembles a recipe and a container an instance prepared from it. The analogy omits filesystem layers, resource isolation, and persistent storage.

## Sources and review

- [Reference](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
