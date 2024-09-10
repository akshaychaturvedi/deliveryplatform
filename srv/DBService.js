const cds = require('@sap/cds');

module.exports = async function (srv) {

    const {
        EngagementsData,
        PhaseCatalog,
        PhasesData,
        DeliverablesData,
        ProvisionedToolsData,
      } = this.entities;

    async function generateEngagementNumber() {

        // Prepare Engagement number
        const latestEngagement = await SELECT.one
            .from(EngagementsData)
            .orderBy('number desc').columns('number');

        // Destructure the string into prefix and numeric parts
        let [prefix, number] = [latestEngagement.number.slice(0, 2), latestEngagement.number.slice(2)];

        // Increment the numeric part and pad it with leading zeros
        let incrementedNumber = String(+number + 1).padStart(number.length, '0');

        // Combine the prefix and the incremented number
        let nextEngagememnt = `${prefix}${incrementedNumber}`;

        return nextEngagememnt;
    };

    this.before('CREATE', 'EngagementsData', async req => {
        try {
            const { name } = req.data;

            // Check if an engagement with the same name already exists
            const engagementExists = await cds.run(
                SELECT.from(EngagementsData)
                    .where({ name }));

            if (engagementExists.length === 0) {
                // When Engagement is created, default status is set to Draft
                req.data.status = 'Draft';
                req.data.number = await generateEngagementNumber();

            } else {
                // Duplicate error message
                req.error(400, `An engagement with the name '${name}' already exists.`);
            }
        } catch (error) {
            // Handle unexpected errors
            req.error(500, `An unexpected error occurred: ${error.message}`);
        }

    }),

        // Execute on click of Confirm
        this.on('UpdateEngagementDetails', async req => {
            try {
                // Get engagement ID from request
                const { engagementID } = req.data;
        
                // Get phase catalog with deliverables, activities and tools
                const phaseCatalog = await cds.run(
                  SELECT.from(PhaseCatalog).columns((p) => {
                    p.rank,
                      p.phase,
                      p.deliverables((d) => {
                        d.deliverable,
                          d.activities((a) => a.activity),
                          d.tools((t) => t.tool);
                      });
                  })
                );
        
                if (!phaseCatalog) {
                  return req.error(404, `Phase Catalog not found in master data`);
                }
        
                // Prepare insert data
                const phaseData = phaseCatalog.map((phase) => {
                  return {
                    phase: phase.phase,
                    rank: phase.rank,
                    isActive: phase.phase === "Discover",
                    isConfirmed: phase.isConfirmed,
                    engagement_ID: engagementID,
                  };
                });
        
                // Create the phases data wrt the engagement
                const insertPhases = await INSERT.into(PhasesData).entries(phaseData);
        
                // Prepare deliverable data
                if (insertPhases) {
                  // Reference table
                  const phaseReference = phaseCatalog.map((data) => {
                    return {
                      phase: data.phase,
                      rank: data.rank,
                      isActive: data.phase === "Discover",
                      isConfirmed: false,
                      deliverables: data.deliverables,
                    };
                  });
        
                  const deliverableData = [];
        
                  for (let phase of phaseData) {
                    const phaseName = phase.phase;
                    const phaseID = phase.ID;
        
                    // Extract phase row and its deliverables
                    const phaseDeliverables = phaseReference.find(
                      ({ phase }) => phase == phaseName
                    ).deliverables;
        
                    deliverableData.push(
                      phaseDeliverables.map((data) => {
                        return {
                          deliverable: data.deliverable,
                          isSelected: false,
                          phase_ID: phaseID,
                          activities: data.activities,
                          tools: data.tools,
                        };
                      })
                    );
                  }
                }
        
                // Flatten array of deliverables
                const flatDeliverablesData = deliverableData.flatMap((arr) => arr);
        
                // Create the deliverables wrt the phases
                const insertDeliverables = await INSERT.into(DeliverablesData).entries(
                  flatDeliverablesData
                );
        
                return {
                  message: `Engagement details updated successfully`,
                };
              } catch (error) {
                // Handle any unexpected errors
                return req.error(500, `An error occurred: ${error.message}`);
              }
            // // Get engagement ID from request
            // const { engagementID } = req.data;

            // // Get phase catalog and prepare data
            // const phaseCatalog = await cds.run(
            //     SELECT.from(PhaseCatalog)
            //         .columns(p => {
            //             p.rank,
            //                 p.phase,
            //                 p.deliverables(d => {
            //                     d.deliverable,
            //                         d.activities(a => a.activity),
            //                         d.tools(t => t.tool)
            //                 })
            //         }));
            // // .columns(p => { p.rank, p.phase, p.deliverables(d => { d.deliverable, d.activites(a => { a.activity }) }) }));
            // const phaseReference = phaseCatalog.map((data) => {
            //     return {
            //         phase: data.phase,
            //         rank: data.rank,
            //         isActive: data.phase === 'Discover',
            //         isConfirmed: false,
            //         deliverables: data.deliverables
            //     }
            // });

            // // Update the engagement
            // const updateResult = await UPDATE(EngagementsData, engagementID).with({
            //     status: 'Active',
            //     phases: phaseReference
            // });
            // return updateResult;
            // // return {
            // //     message: 'Engagement details updated successfully.',
            // // };
        }),

        // Execute on step of each phase
        this.on('ConfirmPhase', async req => {

            try {
                // Get engagement ID from request
                const { engagementID } = req.data;

                // Get active phase associated with the engagement
                const activePhase = await cds.run(
                    SELECT.from(PhasesData)
                        .columns('ID', 'phase')
                        .where({ engagement_ID: engagementID, isActive: true }));

                // Check there is an active phase
                if (!activePhase || activePhase.length === 0) {
                    return req.error(404, `No active phase found for engagement ID: ${engagementID}`);
                }

                const { ID } = activePhase[0];

                // Confirm the active phase
                const updatePhase = await UPDATE(PhasesData, ID).with({
                    isConfirmed: true
                })

                // If the update was successful, return a success message
                if (updatePhase !== 0) {
                    return {
                        message: `Phase ${activePhase[0].phase} has been successfully confirmed.`
                    };
                } else {
                    return req.error(500, `Failed to confirm phase for engagement ID: ${engagementID}`);
                }
            } catch (error) {
                // Handle any unexpected errors
                return req.error(500, `An error occurred: ${error.message}`);
            }
        }),

        // Tool provisioning for engagements
        this.on("updateProvisionedTool", async (req) => {
            try {
                const { engagementNumber, tool, link } = req.data;

                // Retrieve the Engagement by number
                const engagement = await SELECT.one
                    .from(EngagementsData)
                    .where({ number: engagementNumber });

                if (!engagement) {
                    return req.error(404, `Engagement with number ${engagementNumber} not found`);
                }

                // Check if the tool already exists for this engagement
                let provisionedTool = await SELECT.one
                    .from(ProvisionedToolsData)
                    .where({ tool: tool, engagement_ID: engagement.ID });

                if (provisionedTool) {
                    // Update the existing tool link
                    const updateTool = provisionedTool.link = link;
                    await UPDATE(ProvisionedToolsData)
                        .set({ link: link })
                        .where({ ID: provisionedTool.ID });
                    // If successful, return a success message
                    if (updateTool) {
                        return {
                            message: `Successfully update the tool: ${tool} for engagement: ${engagementNumber}.`
                        };
                    } else {
                        return req.error(500, `Failed to update the tool: ${tool} for engagement: ${engagementNumber} `);
                    }
                } else {
                    // Insert a new tool for this engagement
                    const insertTool = await INSERT.into(ProvisionedToolsData).entries({
                        tool: tool,
                        link: link,
                        engagement_ID: engagement.ID,
                    });
                    if (insertTool) {
                        return {
                            message: `Successfully inserted the tool: ${tool} for engagement: ${engagementNumber}.`
                        };
                    } else {
                        return req.error(500, `Failed to inesrt the tool: ${tool} for engagement: ${engagementNumber} `);
                    }
                }
            } catch (error) {
                // Handle any unexpected errors
                return req.error(500, `An error occurred: ${error.message}`);
            }
        })

    // Execute on step of each phase
    this.on('activateNextPhase', async req => {
        try {
            // Get engagement ID from request
            const { engagementID } = req.data;

            // Get the currently active phase
            const activePhase = await cds.run(
                SELECT.from(PhasesData)
                    .columns('ID', 'rank') // Assuming 'rank' is used to order phases
                    .where({ engagement_ID: engagementID, isActive: true })
            );

            // Ensure there's an active phase
            if (!activePhase || activePhase.length === 0) {
                return req.error(404, `No active phase found for engagement ID: ${engagementID}`);
            }

            const { ID: ID, rank: currentRank } = activePhase[0];

            // Deactivate the current phase
            await UPDATE(PhasesData, ID).with({
                isActive: false,
                isConfirmed: false
            });

            // Get the next phase based on rank
            const nextPhase = await cds.run(
                SELECT.from(PhasesData)
                    .columns('ID', 'phase')
                    .where({ engagement_ID: engagementID, rank: { '>': currentRank } })
                    .orderBy('rank asc') // Order by rank to get the next one
                    .limit(1) // Get only the next phase
            );

            // Check there is a next phase
            if (!nextPhase || nextPhase.length === 0) {
                return req.error(404, `No next phase found for engagement ID: ${engagementID}`);
            }

            const { ID: nextPhaseID } = nextPhase[0];

            // Activate the next phase
            const updateNextPhase = await UPDATE(PhasesData, nextPhaseID).with({
                isActive: true
            });

            // If successful, return a success message
            if (updateNextPhase) {
                return {
                    message: `Moved to the next phase: ${nextPhase[0].phase} (ID: ${nextPhaseID}) for engagement ID: ${engagementID}.`
                };
            } else {
                return req.error(500, `Failed to activate the next phase for engagement ID: ${engagementID}`);
            }
        } catch (error) {
            // Handle any unexpected errors
            return req.error(500, `An error occurred: ${error.message}`);
        }
    })

}